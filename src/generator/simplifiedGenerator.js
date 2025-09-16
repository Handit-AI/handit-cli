const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { callLLMAPI } = require('../utils/openai');
const { showInkDiffViewer } = require('../ui/InkDiffViewer');

/**
 * Simplified code generator that only instruments the entry point using AI
 */
class SimplifiedCodeGenerator {
  constructor(language, agentName, projectRoot, apiToken = null, stagingApiToken = null) {
    this.language = language;
    this.agentName = agentName;
    this.projectRoot = projectRoot;
    this.apiToken = apiToken;
    this.stagingApiToken = stagingApiToken;
  }

  /**
   * Generate simplified tracing for entry point only using AI
   */
  async generateEntryPointTracing(entryFile, entryFunction) {
    console.log(chalk.blue.bold('\n🔄 AI-Powered Code Generation'));
    console.log(chalk.gray('Using AI to add tracing to your entry point function...\n'));

    try {
      // Read the file content
      const codeSpinner = ora(`Reading file: ${entryFile}...`).start();
      const filePath = path.resolve(entryFile);
      const fileContent = await fs.readFile(filePath, 'utf8');
      codeSpinner.succeed('File content loaded');

      // Check if handit is already imported
      const hasHanditImport = fileContent.includes(
        this.language === 'python' 
          ? 'from handit_ai import' 
          : '@handit.ai/handit-ai'
      );

      if (hasHanditImport) {
        console.log(chalk.yellow('⚠️  Handit integration already exists, skipping...'));
        return { applied: false };
      }

      // Use AI to generate the complete modified file
      const modifiedContent = await this.addHanditIntegrationToFile(fileContent, entryFile, entryFunction, this.agentName);

      // Show visual diff and get user confirmation
      const shouldApply = await this.showVisualDiffAI(fileContent, modifiedContent, entryFile);

      if (shouldApply) {
        await fs.writeFile(filePath, modifiedContent);
        console.log(chalk.green.bold('✅ Tracing applied successfully!'));
        
        // Show setup instructions
        this.showSetupInstructions();
        
        return { applied: true };
      } else {
        console.log(chalk.yellow('⏭️  Tracing not applied'));
        return { applied: false };
      }

    } catch (error) {
      console.error(chalk.red(`❌ Error generating entry point tracing: ${error.message}`));
      throw error;
    }
  }

  /**
   * Add handit integration to file content using AI-powered code modification
   */
  async addHanditIntegrationToFile(content, filePath, functionName, agentName) {
    const fileExtension = filePath.split('.').pop().toLowerCase();
    
    if (!['py', 'js', 'ts', 'jsx', 'tsx'].includes(fileExtension)) {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    const isPython = fileExtension === 'py';
    const agentNameForCode = agentName || functionName;

    // Use AI to properly integrate handit monitoring
    const messages = [
      {
        role: 'system',
        content: `You are an expert code editor. Your task is to add Handit.ai monitoring to a specific function in a ${isPython ? 'Python' : 'JavaScript/TypeScript'} file.

CRITICAL: You must return the COMPLETE modified file with the actual code changes integrated, NOT comments or instructions.

${isPython ? `
FOR PYTHON FILES:
1. Add these imports after existing imports (with proper spacing):
   from handit_ai import configure, tracing
   import os

2. Add configuration call after imports:
   configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

3. Always Add @tracing decorator directly before the target function:
   @tracing(agent="${agentNameForCode}")

IMPORTANT FOR FASTAPI/FLASK: If the function has route decorators like @app.post(), @app.get(), @router.post(), etc., 
the @tracing decorator must go AFTER the route decorator and BEFORE the function definition.

EXAMPLE TRANSFORMATION:
BEFORE:
import requests
from typing import Dict

def process_data(input_data):
    result = analyze(input_data)
    return result

AFTER:
import requests
from typing import Dict
from handit_ai import configure, tracing
import os

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

@tracing(agent="${agentNameForCode}")
def process_data(input_data):
    result = analyze(input_data)
    return result

FASTAPI EXAMPLE:
BEFORE:
from fastapi import FastAPI
app = FastAPI()

@app.post("/bulk-unstructured-to-structured")
def process_bulk_data(data):
    result = analyze(data)
    return result

AFTER:
from fastapi import FastAPI
from handit_ai import configure, tracing
import os

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

app = FastAPI()

@app.post("/bulk-unstructured-to-structured")
@tracing(agent="${agentNameForCode}")
def process_bulk_data(data):
    result = analyze(data)
    return result
` : `
FOR JAVASCRIPT/TYPESCRIPT FILES:
1. Add import after existing imports:
   import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

2. Add configuration after imports:
   configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY }); // Get API key from https://dashboard.handit.ai/settings/integrations

3. Modify the target function to include tracing:
   - Add startTracing({ agent: "${agentNameForCode}" }); at function start
   - Wrap existing code in try/finally with endTracing()

EXAMPLE TRANSFORMATION:
BEFORE:
import express from 'express';

const processRequest = async (data) => {
  const result = await analyze(data);
  return result;
};

AFTER:
import express from 'express';
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

const processRequest = async (data) => {
  startTracing({ agent: "${agentNameForCode}" });
  try {
    const result = await analyze(data);
    return result;
  } finally {
    endTracing();
  }
};

EXPRESS.JS EXAMPLE:
BEFORE:
import express from 'express';
const app = express();

app.post('/api/process', async (req, res) => {
  const result = await processData(req.body);
  res.json(result);
});

AFTER:
import express from 'express';
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

const app = express();

app.post('/api/process', async (req, res) => {
  startTracing({ agent: "${agentNameForCode}" });
  try {
    const result = await processData(req.body);
    res.json(result);
  } finally {
    endTracing();
  }
});
`}

CRITICAL RULES - DO NOT VIOLATE:
- Return the COMPLETE file with ONLY the monitoring code added
- NEVER change existing code logic, variable names, function signatures, or any existing functionality
- NEVER modify existing imports, comments, or documentation
- NEVER change indentation or formatting of existing code
- NEVER add, remove, or modify any existing function parameters
- NEVER change return statements or existing code flow
- ONLY add the handit monitoring imports, configuration, and decorators/tracing
- Find the function "${functionName}" and add monitoring to it WITHOUT changing the function itself
- Don't add comments like "ADD THIS" - add the actual code
- If imports already exist, don't duplicate them
- CRITICAL: For Python functions with route decorators (@app.post, @router.get, etc.), place @tracing decorator AFTER the route decorator and BEFORE the function definition
- CRITICAL: For JavaScript route handlers, add startTracing/endTracing INSIDE the function body, not as decorators
- ABSOLUTELY PRESERVE: All existing variable names, function names, class names, method names, and any existing logic`
      },
      {
        role: 'user',
        content: `File: ${filePath}
Function to monitor: ${functionName}
Agent name: ${agentNameForCode}

Current file content:
\`\`\`
${content}
\`\`\`

Please add Handit.ai monitoring to the "${functionName}" function following the requirements above.`
      }
    ];

    try {
      const response = await callLLMAPI({
        messages,
        model: 'gpt-4o-mini',
        temperature: 0.1
      });

      let result = response.choices[0].message.content;
      
      
      // Remove markdown code block markers if present
      if (result.startsWith('```')) {
        const lines = result.split('\n');
        // Remove first line if it starts with ```
        if (lines[0].startsWith('```')) {
          lines.shift();
        }
        // Remove last line if it's just ```
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        result = lines.join('\n');
      }
      
      
      console.log(chalk.gray(`✅ AI-generated handit integration for ${filePath}`));
      
      return result;
    } catch (error) {
      console.error('Error using AI for code modification:', error);
      throw new Error(`AI code generation failed: ${error.message}`);
    }
  }

  /**
   * Show visual diff between original and AI-generated content
   */
  async showVisualDiffAI(originalContent, modifiedContent, filePath) {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');

    // Use a smarter diff algorithm
    // Clean up the lines to avoid undefined issues
    const cleanOriginalLines = originalLines.map(line => line || '');
    const cleanModifiedLines = modifiedLines.map(line => line || '');
    const changes = this.computeSmartDiff(cleanOriginalLines, cleanModifiedLines);
    
    // Show the beautiful Ink-based diff viewer
    return await showInkDiffViewer(filePath, changes);
  }


  /**
   * Compute a smart diff that groups actual changes
   */
  computeSmartDiff(originalLines, modifiedLines) {
    const changes = [];
    let i = 0, j = 0;
    
    
    while (i < originalLines.length || j < modifiedLines.length) {
      const originalLine = i < originalLines.length ? originalLines[i] : undefined;
      const modifiedLine = j < modifiedLines.length ? modifiedLines[j] : undefined;
      
      if (i >= originalLines.length) {
        // Only modified lines left
        changes.push({
          type: 'add',
          line: j + 1,
          content: modifiedLine || '', // Handle undefined/empty lines
          originalLine: null
        });
        j++;
      } else if (j >= modifiedLines.length) {
        // Only original lines left
        changes.push({
          type: 'remove',
          line: i + 1,
          content: originalLine || '', // Handle undefined/empty lines
          modifiedLine: null
        });
        i++;
      } else if (originalLine === modifiedLine) {
        // Lines match, advance both
        i++;
        j++;
      } else {
        // Look ahead to see if this is a simple insertion/deletion
        let foundMatch = false;
        
        // Check if next few original lines match current modified line
        for (let k = 1; k <= 3 && i + k < originalLines.length; k++) {
          if (originalLines[i + k] === modifiedLine) {
            // Found match, this is an insertion
            for (let l = 0; l < k; l++) {
              const lineIndex = i + l;
              const lineContent = lineIndex < originalLines.length ? originalLines[lineIndex] : '';
              changes.push({
                type: 'add',
                line: j + 1,
                content: lineContent,
                originalLine: null
              });
            }
            i += k;
            foundMatch = true;
            break;
          }
        }
        
        if (!foundMatch) {
          // Check if next few modified lines match current original line
          for (let k = 1; k <= 3 && j + k < modifiedLines.length; k++) {
            if (modifiedLines[j + k] === originalLine) {
              // Found match, this is a deletion
              for (let l = 0; l < k; l++) {
                const lineIndex = j + l;
                const lineContent = lineIndex < modifiedLines.length ? modifiedLines[lineIndex] : '';
                changes.push({
                  type: 'add',
                  line: i + 1,
                  content: lineContent,
                  modifiedLine: null
                });
              }
              j += k;
              foundMatch = true;
              break;
            }
          }
        }
        
        if (!foundMatch) {
          // This is a modification
          changes.push({
            type: 'modify',
            line: i + 1,
            content: originalLine || '', // Handle undefined/empty lines
            modifiedContent: modifiedLine || '' // Handle undefined/empty lines
          });
          i++;
          j++;
        }
      }
    }
    
    return changes;
  }

  /**
   * Show changes with context around them
   */
  showChangesWithContext(originalLines, changes) {
    if (changes.length === 0) {
      console.log(chalk.gray('No changes detected'));
      return;
    }

    // Group changes by proximity
    const changeGroups = this.groupChangesByProximity(changes);
    
    changeGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        console.log(chalk.gray('   ...'));
      }
      
      const startLine = Math.max(1, group.startLine - 2);
      const endLine = Math.min(originalLines.length, group.endLine + 2);
      
      // Show context before changes
      for (let i = startLine; i < group.startLine; i++) {
        const lineContent = originalLines[i - 1] || '';
        console.log(chalk.gray(`  ${i.toString().padStart(3)}: ${lineContent}`));
      }
      
      // Show changes
      group.changes.forEach(change => {
        if (change.type === 'add') {
          console.log(chalk.green(`+ ${change.line.toString().padStart(3)}: ${change.content}`));
        } else if (change.type === 'remove') {
          console.log(chalk.red(`- ${change.line.toString().padStart(3)}: ${change.content}`));
        } else if (change.type === 'modify') {
          console.log(chalk.red(`- ${change.line.toString().padStart(3)}: ${change.content}`));
          console.log(chalk.green(`+ ${change.line.toString().padStart(3)}: ${change.modifiedContent}`));
        }
      });
      
      // Show context after changes
      for (let i = group.endLine + 1; i <= endLine; i++) {
        const lineContent = originalLines[i - 1] || '';
        console.log(chalk.gray(`  ${i.toString().padStart(3)}: ${lineContent}`));
      }
    });
  }

  /**
   * Group changes by proximity to show them together
   */
  groupChangesByProximity(changes) {
    if (changes.length === 0) return [];
    
    const groups = [];
    let currentGroup = {
      changes: [changes[0]],
      startLine: changes[0].line,
      endLine: changes[0].line
    };
    
    for (let i = 1; i < changes.length; i++) {
      const change = changes[i];
      const lastChange = currentGroup.changes[currentGroup.changes.length - 1];
      
      // If changes are close together (within 5 lines), group them
      if (change.line - lastChange.line <= 5) {
        currentGroup.changes.push(change);
        currentGroup.endLine = change.line;
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = {
          changes: [change],
          startLine: change.line,
          endLine: change.line
        };
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  /**
   * Show setup instructions with the user's actual API token
   */
  showSetupInstructions() {
    console.log(chalk.green.bold('\n🎉 Congratulations! Your agent is now connected!'));
    console.log(chalk.gray('─'.repeat(60)));
    
    if (this.language === 'python') {
      console.log(chalk.yellow('📦 Install the Python SDK:'));
      console.log(chalk.white('   pip install handit_ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key in your environment:'));
      console.log(chalk.white('   # Add to your .env file or export directly'));
      console.log(chalk.white(`   export HANDIT_API_KEY=${this.stagingApiToken || this.apiToken || 'your_api_key_here'}`));
      console.log('');
      console.log(chalk.yellow('🚀 Run your agent:'));
      console.log(chalk.white('   python your_agent_file.py'));
    } else {
      console.log(chalk.yellow('📦 Install the JavaScript SDK:'));
      console.log(chalk.white('   npm install @handit.ai/handit-ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key in your environment:'));
      console.log(chalk.white('   # Add to your .env file or export directly'));
      console.log(chalk.white(`   export HANDIT_API_KEY=${this.stagingApiToken || this.apiToken || 'your_api_key_here'}`));
      console.log('');
      console.log(chalk.yellow('🚀 Run your agent:'));
      console.log(chalk.white('   node your_agent_file.js'));
    }
    
    console.log('');
    console.log(chalk.cyan.bold('🔧 API Keys:'));
    console.log(chalk.gray('   Staging (recommended for development):'));
    console.log(chalk.white(`   ${this.stagingApiToken || 'Not available'}`));
    console.log(chalk.gray('   Production (for live deployments):'));
    console.log(chalk.white(`   ${this.apiToken || 'Not available'}`));
    console.log('');
    console.log(chalk.green('✅ Your agent is now instrumented with handit.ai monitoring!'));
    console.log(chalk.gray('   Traces will appear in your dashboard at https://dashboard.handit.ai'));
    console.log(chalk.gray('─'.repeat(60)));
  }
}

module.exports = { SimplifiedCodeGenerator };