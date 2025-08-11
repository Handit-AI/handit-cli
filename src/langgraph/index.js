const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const inquirer = require('inquirer').default;

async function listPythonFiles(projectRoot) {
  const matches = await glob('**/*.py', {
    cwd: projectRoot,
    ignore: ['**/venv/**', '**/.venv/**', '**/__pycache__/**', 'node_modules/**', '.git/**']
  });
  return matches.sort();
}

function findInvokeSitesInContent(content) {
  const lines = content.split('\n');
  const sites = [];
  const regex = /(invoke|ainvoke)\s*\(/;
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      sites.push({ line: i + 1, code: lines[i].trim() });
    }
  }
  return sites;
}

async function findInvokeSites(projectRoot) {
  const files = await listPythonFiles(projectRoot);
  const results = [];
  for (const rel of files) {
    const abs = path.join(projectRoot, rel);
    try {
      const content = await fs.readFile(abs, 'utf8');
      if (/langgraph|Runnable|run\s*\(|graph\s*\.|workflow\s*\./.test(content)) {
        const sites = findInvokeSitesInContent(content);
        if (sites.length > 0) {
          results.push({ file: rel, sites });
        }
      }
    } catch (_) { /* ignore unreadable files */ }
  }
  return results;
}

function buildCallbackFileContent(agentName) {
  return `from handit_service import tracker\n\n\nclass HanditCallback:\n    def __init__(self, agent_name="${agentName}"):\n        self.agent_name = agent_name\n        self.execution_id = None\n\n    def on_graph_start(self, inputs):\n        resp = tracker.start_tracing(agent_name=self.agent_name)\n        self.execution_id = resp.get("executionId")\n\n    def on_node_end(self, node_name, input_data=None, output_data=None, node_type="model"):\n        if self.execution_id:\n            tracker.track_node(\n                input=input_data or {},\n                output=output_data,\n                node_name=node_name,\n                agent_name=self.agent_name,\n                node_type=node_type,\n                execution_id=self.execution_id\n            )\n\n    def on_graph_end(self):\n        if self.execution_id:\n            tracker.end_tracing(execution_id=self.execution_id, agent_name=self.agent_name)\n`;
}

async function ensureCallbackFile(projectRoot, agentName) {
  const target = path.join(projectRoot, 'handit_langgraph_callbacks.py');
  if (!(await fs.pathExists(target))) {
    await fs.writeFile(target, buildCallbackFileContent(agentName), 'utf8');
  }
  return target;
}

function applyMinimalInvokeEdit(original, agentName) {
  // Attempt to add RunnableConfig callbacks if not present
  // Replace first occurrence of (invoke|ainvoke)(args) -> (args, config=RunnableConfig(callbacks=[HanditCallback(agent_name="...")])) if not already provided
  if (/config\s*=/.test(original)) return original; // already passes config; leave as-is
  const cb = `config=RunnableConfig(callbacks=[HanditCallback(agent_name="${agentName}")])`;
  return original.replace(/(invoke|ainvoke)\s*\((.*)\)/, (m, fn, args) => {
    const trimmed = (args || '').trim();
    if (!trimmed) return `${fn}(${cb})`;
    return `${fn}(${trimmed}, ${cb})`;
  });
}

async function wireInvokeAtSite(projectRoot, relFile, lineNumber, agentName) {
  const abs = path.join(projectRoot, relFile);
  const content = await fs.readFile(abs, 'utf8');
  const lines = content.split('\n');
  const originalLine = lines[lineNumber - 1];
  let modifiedLine = originalLine;

  // Ensure imports
  const needsRunnableImport = !/from\s+langchain_core\.runnables\s+import\s+RunnableConfig/.test(content);
  const needsCallbackImport = !/from\s+handit_langgraph_callbacks\s+import\s+HanditCallback/.test(content);

  modifiedLine = applyMinimalInvokeEdit(modifiedLine, agentName);
  lines[lineNumber - 1] = modifiedLine;

  const newLines = [...lines];
  const insertAt = 0;
  const toInsert = [];
  if (needsRunnableImport) toInsert.push('from langchain_core.runnables import RunnableConfig');
  if (needsCallbackImport) toInsert.push('from handit_langgraph_callbacks import HanditCallback');
  if (toInsert.length > 0) newLines.splice(insertAt, 0, ...toInsert);

  await fs.writeFile(abs, newLines.join('\n'), 'utf8');
}

async function maybeHandleLangGraph(projectInfo, config) {
  const projectRoot = config.projectRoot || process.cwd();
  if ((config.language || '').toLowerCase() !== 'python') return { handled: false };

  // Quick scan for LangGraph usage
  const candidates = await findInvokeSites(projectRoot);
  if (candidates.length === 0) return { handled: false };

  console.log(chalk.blue.bold('\nLangGraph detected. Using callback-based tracing.'));

  // Flatten sites and prompt
  const flat = [];
  candidates.forEach(({ file, sites }) => sites.forEach(s => flat.push({ file, line: s.line, code: s.code })));
  const { chosen } = await inquirer.prompt([
    {
      type: 'list',
      name: 'chosen',
      message: 'Confirm the invoke site to wire tracing:',
      choices: flat.map((s, idx) => ({ name: `${s.file}:${s.line}  ${s.code}`, value: idx }))
    }
  ]);
  const site = flat[chosen];

  // Confirm
  const { confirm } = await inquirer.prompt([
    { type: 'confirm', name: 'confirm', message: `Wire callbacks at ${site.file}:${site.line}?`, default: true }
  ]);
  if (!confirm) return { handled: false };

  // Ensure callback file
  await ensureCallbackFile(projectRoot, projectInfo.agentName);
  // Wire invoke
  await wireInvokeAtSite(projectRoot, site.file, site.line, projectInfo.agentName);

  console.log(chalk.green('LangGraph tracing installed. Run your graph to emit traces.'));
  return { handled: true };
}

module.exports = { maybeHandleLangGraph };