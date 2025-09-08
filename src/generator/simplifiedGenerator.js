const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer').default;
const ora = require('ora').default;
const { callLLMAPI } = require('../utils/openai');

/**
 * Simplified code generator that only instruments the entry point using AI
 */
class SimplifiedCodeGenerator {
  constructor(language, agentName, projectRoot, apiToken = null) {
    this.language = language;
    this.agentName = agentName;
    this.projectRoot = projectRoot;
    this.apiToken = apiToken;
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
      const aiSpinner = ora('🤖 AI is generating the modified code...').start();
      const modifiedContent = await this.addHanditIntegrationToFile(fileContent, entryFile, entryFunction, this.agentName);
      aiSpinner.succeed('AI code generation complete');

      // Show visual diff
      this.showVisualDiffAI(fileContent, modifiedContent, entryFile);

      // Ask for confirmation
      const { shouldApply } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldApply',
          message: 'Apply this tracing to your entry point?',
          default: true
        }
      ]);

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
   configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))  # Get API key from https://dashboard.handit.ai/settings/integrations

3. Add @tracing decorator directly before the target function:
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

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))  # Get your API key from https://dashboard.handit.ai/settings/integrations

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

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))  # Get your API key from https://dashboard.handit.ai/settings/integrations

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

configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY }); // Get your API key from https://dashboard.handit.ai/settings/integrations

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

configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY }); // Get your API key from https://dashboard.handit.ai/settings/integrations

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
  showVisualDiffAI(originalContent, modifiedContent, filePath) {
    console.log(chalk.blue.bold('\n📋 Proposed Changes'));
    console.log(chalk.gray(`File: ${filePath}`));
    console.log(chalk.gray('─'.repeat(60)));

    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');

    // Simple diff display
    let i = 0, j = 0;
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let lineNum = 1; lineNum <= maxLines; lineNum++) {
      const originalLine = originalLines[i];
      const modifiedLine = modifiedLines[j];
      
      if (originalLine === modifiedLine) {
        // Lines are the same
        console.log(chalk.gray(`  ${lineNum.toString().padStart(3)}: ${originalLine || ''}`));
        i++;
        j++;
      } else if (!originalLine) {
        // New line added
        console.log(chalk.green(`+ ${lineNum.toString().padStart(3)}: ${modifiedLine}`));
        j++;
      } else if (!modifiedLine) {
        // Line removed
        console.log(chalk.red(`- ${lineNum.toString().padStart(3)}: ${originalLine}`));
        i++;
      } else {
        // Line modified
        console.log(chalk.red(`- ${lineNum.toString().padStart(3)}: ${originalLine}`));
        console.log(chalk.green(`+ ${lineNum.toString().padStart(3)}: ${modifiedLine}`));
        i++;
        j++;
      }
    }

    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Show setup instructions with the user's actual API token
   */
  showSetupInstructions() {
    console.log(chalk.blue.bold('\n🎯 Setup Instructions'));
    console.log(chalk.gray('─'.repeat(60)));
    
    if (this.language === 'python') {
      console.log(chalk.yellow('📦 Install the Python SDK:'));
      console.log(chalk.white('   pip install handit_ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key:'));
      console.log(chalk.white(`   export HANDIT_API_KEY=${this.apiToken || 'your_api_key_here'}`));
      console.log('');
      console.log(chalk.yellow('🚀 Run your agent:'));
      console.log(chalk.white('   python your_agent_file.py'));
    } else {
      console.log(chalk.yellow('📦 Install the JavaScript SDK:'));
      console.log(chalk.white('   npm install @handit.ai/handit-ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key:'));
      console.log(chalk.white(`   export HANDIT_API_KEY=${this.apiToken || 'your_api_key_here'}`));
      console.log('');
      console.log(chalk.yellow('🚀 Run your agent:'));
      console.log(chalk.white('   node your_agent_file.js'));
    }
    
    console.log('');
    console.log(chalk.green('✅ Your agent is now instrumented with handit.ai monitoring!'));
    console.log(chalk.gray('   Traces will appear in your dashboard at https://dashboard.handit.ai'));
    console.log(chalk.gray('─'.repeat(60)));
  }
}

module.exports = { SimplifiedCodeGenerator };