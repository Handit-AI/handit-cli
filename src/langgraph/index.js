const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { findPossibleFiles } = require('../utils/fileDetector');
const { HanditApi } = require('../api/handitApi');
const { TokenStorage } = require('../auth/tokenStorage');
const { IterativeCodeGenerator } = require('../generator/iterativeGenerator');
const { callLLMAPI } = require('../utils/openai');

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

async function findInvokeSitesWithLLM(projectRoot) {
  try {
    const all = await listPythonFiles(projectRoot);
    if (all.length === 0) return [];
    const prompt = 'Find likely python files that orchestrate LangGraph graph execution (e.g., app_graph.invoke/app_graph.ainvoke or compiled_graph.invoke). Prioritize entrypoints, CLI, main scripts.';
    const possible = await findPossibleFiles(prompt, all);
    const results = [];
    for (const cand of possible.slice(0, 5)) {
      const rel = cand.file;
      const abs = path.join(projectRoot, rel);
      try {
        const content = await fs.readFile(abs, 'utf8');
        const sites = findInvokeSitesInContent(content);
        if (sites.length > 0) results.push({ file: rel, sites });
      } catch (_) { /* ignore */ }
    }
    return results;
  } catch (_) {
    return [];
  }
}

async function callAIForLangGraphEdits({ projectRoot, agentName, targetFile, targetLine, fileContent }) {
  const tokenStorage = new TokenStorage();
  const tokens = await tokenStorage.loadTokens();
  const api = new HanditApi();
  api.authToken = tokens?.authToken || null;
  api.apiToken = tokens?.apiToken || null;

  const system = `You are an expert Python engineer familiar with LangGraph and LangChain callbacks. 
  Generate a Handit tracing callback and minimal code edits to wire callbacks into a specific invoke/ainvoke call. 

  Make sure that the code will compile and run, check that the parameters you used on each function are correct.
  Output valid JSON only with the following format:
  {
    "callback_path": "string (relative path for new file, suggest: handit_langgraph_callbacks.py)",
    "callback_code": "string (full file content)",
    "imports_to_add": ["string import lines to insert near top of target file"],
    "invoke_replacement": "string (full replacement of the target line with wired callbacks)",
    "notes": "string brief"
  }
  `;
  const user = {
    instruction: 'Generate a Python callback file using LangChain BaseCallbackHandler and an edit to wire callbacks into the invoke/ainvoke line.',
    constraints: [
      'Imports: use from handit_service import tracker and from langchain_core.callbacks import BaseCallbackHandler.',
      'Do NOT call tracker.track_node in on_llm_start. Save inputs only.',
      'LLM: on_llm_start(serialized, prompts/messages, run_id, tags, metadata, model, **kwargs) -> save {messages, model} in a dict keyed by run_id.',
      'LLM: on_llm_end(response, run_id, **kwargs) -> tracker.track_node with input saved from start and output from response. node_type="model". Use a unique node_name for each LLM call, save the node_name in the on start using the serialized.get("name") and use it on the on_llm_end.',
      'Tools: on_tool_start(serialized, input_str or tool_input, run_id, **kwargs) -> save input in dict keyed by run_id.',
      'Tools: on_tool_end(output, run_id, **kwargs) -> tracker.track_node with saved input and output. node_type="tool". Use a unique node_name for each tool call, save the node_name in the on start using the serialized.get("name") and use it on the on_tool_end.',
      'Always pass objects: input and output must be dicts. For LLM, input={"messages": [...], "model": "..."}. For tools, input={"input": ...}.',
      'Graph: on_chain_start -> tracker.start_tracing(agent_name) and store execution_id; on_chain_end -> tracker.end_tracing. Optionally also track a graph_end node.',
      'Support concurrency: maintain self._llm_inputs and self._tool_inputs dicts keyed by run_id. Clean up entries in end hooks.',
      'If the invoke already passes a config/callbacks, merge HanditCallback without removing existing callbacks.',
      'Return minimal import lines to add in the target file and the exact replacement of the invoke line with callbacks wired.',
    ],
    context: {
      agentName,
      targetFile,
      targetLine,
      fileContentSnippet: fileContent.split('\n').slice(Math.max(0, targetLine - 15), targetLine + 15).join('\n')
    },
    output_format: {
      callback_path: 'string (relative path for new file, suggest: handit_langgraph_callbacks.py)',
      callback_code: 'string (full file content)',
      imports_to_add: ['string import lines to insert near top of target file'],
      invoke_replacement: 'string (full replacement of the target line with wired callbacks)',
      notes: 'string brief'
    }
  };

  const text = await callLLMAPI({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user, null, 2) }
    ],
    model: 'gpt-4o',
    response_format: { type: 'json_object' }
  });
  // Attempt to parse JSON from response
  let json;
  try {
    json = JSON.parse(text.choices[0].message.content);
  } catch (e) {
    throw new Error('AI did not return valid JSON');
  }
  return json;
}

async function applyAIEdits({ projectRoot, agentName, site, content }) {
  const abs = path.join(projectRoot, site.file);
  const fileContent = await fs.readFile(abs, 'utf8');
  const lines = fileContent.split('\n');
  const originalLine = lines[site.line - 1];

  // Preview
  console.log(chalk.cyan('\nPlanned changes (AI-generated):'));
  console.log(chalk.gray('New callback file:'), content.callback_path);
  console.log(chalk.gray('Imports to add:'));
  (content.imports_to_add || []).forEach(l => console.log('  ' + l));
  console.log(chalk.gray(`Edit ${site.file}:${site.line}`));
  console.log(chalk.red('- ' + originalLine.trim()));
  console.log(chalk.green('+ ' + (content.invoke_replacement || '').trim()));

  const { proceed } = await inquirer.prompt([
    { type: 'confirm', name: 'proceed', message: 'Apply these AI-generated changes?', default: true }
  ]);
  if (!proceed) return false;

  // Write callback file
  const cbPath = path.join(projectRoot, content.callback_path || 'handit_langgraph_callbacks.py');
  await fs.writeFile(cbPath, content.callback_code, 'utf8');

  // Apply imports
  const newLines = [...lines];
  if (Array.isArray(content.imports_to_add) && content.imports_to_add.length > 0) {
    newLines.splice(0, 0, ...content.imports_to_add);
  }

  if (content.invoke_replacement) {
    newLines[site.line] = content.invoke_replacement;
  }
  await fs.writeFile(abs, newLines.join('\n'), 'utf8');
  return true;
}

async function maybeHandleLangGraph(projectInfo, config) {
  const projectRoot = config.projectRoot || process.cwd();
  if ((config.language || '').toLowerCase() !== 'python') return { handled: false };

  let candidates = await findInvokeSites(projectRoot);
  if (candidates.length === 0) {
    console.log(chalk.gray('No invoke sites found statically. Trying AI-assisted discovery...'));
    candidates = await findInvokeSitesWithLLM(projectRoot);
  }
  if (candidates.length === 0) return { handled: false };

  console.log(chalk.blue.bold('\nLangGraph detected. Using callback-based tracing.'));

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

  const abs = path.join(projectRoot, site.file);
  const fileContent = await fs.readFile(abs, 'utf8');

  const { confirm } = await inquirer.prompt([
    { type: 'confirm', name: 'confirm', message: `Wire callbacks at ${site.file}:${site.line}?`, default: true }
  ]);
  if (!confirm) return { handled: false };

  // Prefer AI generation for callback and wiring
  try {
    const ai = await callAIForLangGraphEdits({ projectRoot, agentName: projectInfo.agentName, targetFile: site.file, targetLine: site.line, fileContent });
    const ok = await applyAIEdits({ projectRoot, agentName: projectInfo.agentName, site, content: ai });
    if (ok) {
      console.log(chalk.green('LangGraph tracing installed (AI-generated).'));
      return { handled: true };
    }
  } catch (e) {
    console.log(chalk.yellow(`AI generation failed: ${e.message}. Falling back to minimal wiring.`));
  }

  // Fallback to minimal deterministic wiring if AI fails/cancelled
  const targetCreated = await ensureCallbackFile(projectRoot, projectInfo.agentName);
  const ok = await wireInvokeAtSite(projectRoot, site.file, site.line, projectInfo.agentName);
  
  if (!ok) return { handled: false };

  console.log(chalk.green('LangGraph tracing installed. Run your graph to emit traces.'));
  return { handled: true };
}

// Template-based helpers kept as fallback
function buildCallbackFileContent(agentName) {
  return `from handit_service import tracker\nfrom langchain_core.callbacks import BaseCallbackHandler\n\n\nclass HanditCallback(BaseCallbackHandler):\n    def __init__(self, agent_name="${agentName}"):\n        self.agent_name = agent_name\n        self.execution_id = None\n        self._llm_inputs = {}  # run_id -> {messages, model}\n        self._tool_inputs = {}  # run_id -> input\n\n    # Graph lifecycle\n    def on_chain_start(self, serialized, inputs, run_id=None, **kwargs):\n        resp = tracker.start_tracing(agent_name=self.agent_name)\n        self.execution_id = resp.get("executionId")\n\n    def on_chain_end(self, outputs, run_id=None, **kwargs):\n        if self.execution_id is not None:\n            tracker.end_tracing(execution_id=self.execution_id, agent_name=self.agent_name)\n\n    # LLM\n    def on_llm_start(self, serialized, prompts, run_id=None, **kwargs):\n        try:\n            model = None\n            if isinstance(serialized, dict):\n                model = serialized.get("model") or serialized.get("id")\n            msgs = prompts if isinstance(prompts, list) else [prompts]\n            self._llm_inputs[run_id] = {"messages": msgs, "model": model}\n        except Exception:\n            self._llm_inputs[run_id] = {"messages": prompts, "model": None}\n\n    def on_llm_end(self, response, run_id=None, **kwargs):\n        saved = self._llm_inputs.pop(run_id, {"messages": None, "model": None})\n        input_obj = {"messages": saved.get("messages"), "model": saved.get("model")}\n        output_obj = getattr(response, "generations", None) or getattr(response, "output", None) or response\n        tracker.track_node(\n            input=input_obj,\n            output=output_obj,\n            node_name="LLM",\n            agent_name=self.agent_name,\n            node_type="model",\n            execution_id=self.execution_id\n        )\n\n    # Tools\n    def on_tool_start(self, serialized, input_str, run_id=None, **kwargs):\n        self._tool_inputs[run_id] = input_str\n\n    def on_tool_end(self, output, run_id=None, **kwargs):\n        saved = self._tool_inputs.pop(run_id, None)\n        input_obj = {"input": saved}\n        tracker.track_node(\n            input=input_obj,\n            output=output,\n            node_name=(serialized.get("name") if isinstance(serialized, dict) else "Tool"),\n            agent_name=self.agent_name,\n            node_type="tool",\n            execution_id=self.execution_id\n        )\n`;
}

async function ensureCallbackFile(projectRoot, agentName) {
  const target = path.join(projectRoot, 'handit_langgraph_callbacks.py');
  if (!(await fs.pathExists(target))) {
    await fs.writeFile(target, buildCallbackFileContent(agentName), 'utf8');
  }
  return target;
}

function applyMinimalInvokeEdit(original, agentName) {
  const hasConfig = /config\s*=/.test(original);
  const cbCall = `HanditCallback(agent_name="${agentName}")`;
  if (hasConfig) {
    if (/callbacks\s*=\s*\[/.test(original)) {
      return original.replace(/callbacks\s*=\s*\[/, `callbacks=[${cbCall}, `);
    }
    return original.replace(/config\s*=\s*([^,)]+)\)/, (m) => m.replace(/\)$/, `, callbacks=[${cbCall}])`));
  }
  const rc = `config=RunnableConfig(callbacks=[${cbCall}])`;
  return original.replace(/(invoke|ainvoke)\s*\((.*)\)/, (m, fn, args) => {
    const trimmed = (args || '').trim();
    if (!trimmed) return `${fn}(${rc})`;
    return `${fn}(${trimmed}, ${rc})`;
  });
}

async function wireInvokeAtSite(projectRoot, relFile, lineNumber, agentName) {
  const abs = path.join(projectRoot, relFile);
  const content = await fs.readFile(abs, 'utf8');
  const lines = content.split('\n');
  const originalLine = lines[lineNumber - 1];
  let modifiedLine = applyMinimalInvokeEdit(originalLine, agentName);

  const needsRunnableImport = !/from\s+langchain_core\.runnables\s+import\s+RunnableConfig/.test(content);
  const needsCallbackImport = !/from\s+handit_langgraph_callbacks\s+import\s+HanditCallback/.test(content);

  const importPreview = [];
  if (needsRunnableImport) importPreview.push('from langchain_core.runnables import RunnableConfig');
  if (needsCallbackImport) importPreview.push('from handit_langgraph_callbacks import HanditCallback');

  console.log(chalk.cyan('\nPlanned changes:'));
  if (importPreview.length > 0) {
    console.log(chalk.gray('Imports to add at top:'));
    importPreview.forEach(l => console.log('  ' + l));
  }
  console.log(chalk.gray(`Edit ${relFile}:${lineNumber}`));
  console.log(chalk.red('- ' + originalLine.trim()));
  console.log(chalk.green('+ ' + modifiedLine.trim()));

  const { proceed } = await inquirer.prompt([
    { type: 'confirm', name: 'proceed', message: 'Apply these changes?', default: true }
  ]);
  if (!proceed) return false;

  lines[lineNumber - 1] = modifiedLine;
  const newLines = [...lines];
  if (importPreview.length > 0) newLines.splice(0, 0, ...importPreview);
  await fs.writeFile(abs, newLines.join('\n'), 'utf8');
  return true;
}

module.exports = { maybeHandleLangGraph };