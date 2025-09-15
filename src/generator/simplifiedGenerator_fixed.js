const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { callLLMAPI } = require('../utils/openai');

/**
 * Simplified code generator that only instruments the entry point
 */
class SimplifiedCodeGenerator {
  constructor(language, agentName, projectRoot, apiToken = null) {
    this.language = language;
    this.agentName = agentName;
    this.projectRoot = projectRoot;
    this.apiToken = apiToken;
  }

  /**
   * Generate simplified tracing for entry point only
   */
  async generateEntryPointTracing(entryFile, entryFunction) {
    console.log(chalk.blue.bold('\n🔄 Simplified Code Generation'));
    console.log(chalk.gray('Adding tracing to your entry point function only...\n'));

    try {
      // Create a mock node for the entry point
      const entryNode = {
        id: 'entry-point',
        name: entryFunction,
        file: entryFile,
        line: await this.findFunctionLine(entryFile, entryFunction)
      };

      // Read the file content
      const codeSpinner = ora(`Reading file: ${entryFile}...`).start();
      const filePath = path.resolve(entryFile);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n');
      codeSpinner.succeed('File content loaded');

      // Detect FastAPI if Python
      const isFastAPIEndpoint = this.language === 'python' ? await this.detectFastAPIEndpoint(entryNode) : false;
      if (isFastAPIEndpoint) {
        console.log(chalk.blue('🔍 FastAPI endpoint detected - will place tracing decorator below endpoint decorator'));
      }

      // Detect where to add tracing
      const detectionSpinner = ora('Detecting changes to apply...').start();
      const changes = await this.detectPositionsWithAI(lines, entryNode, isFastAPIEndpoint);
      detectionSpinner.succeed('Changes detected');

      // Show visual diff with the amazing diff viewer
      this.showVisualDiff(entryNode, lines, changes);

      // Ask for confirmation with simple Yes/No options
      const { shouldApply } = await inquirer.prompt([
        {
          type: 'list',
          name: 'shouldApply',
          message: `Do you want to make this edit to ${entryFile.split('/').pop()}?`,
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false }
          ],
          default: true
        }
      ]);

      if (shouldApply) {
        await this.applySimpleChanges(entryNode, lines, changes);
        console.log(chalk.green.bold('✅ Tracing applied successfully!'));
        
        // Show setup instructions
        this.showSetupInstructions();
        
        return { applied: true, entryNode, changes };
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
   * Use AI to detect exactly where to place imports, config, and decorators
   */
  async detectPositionsWithAI(lines, entryNode, isFastAPIEndpoint) {
    // Check if handit is already imported
    const hasHanditImport = lines.some(line => 
      this.language === 'python' 
        ? line.includes('from handit_ai import') 
        : line.includes('@handit.ai/handit-ai')
    );

    if (hasHanditImport) {
      console.log(chalk.yellow('⚠️  Handit integration already exists, skipping...'));
      return { additions: [] };
    }

    const fileContent = lines.join('\n');
    const prompt = this.createPositionDetectionPrompt(fileContent, entryNode, isFastAPIEndpoint);

    const response = await callLLMAPI({
      messages: [
        {
          role: 'system',
          content: `You are an expert at detecting exact positions in code files. Your job is to find the EXACT line numbers where to add Handit.ai tracing.

CRITICAL: Return ONLY the specific lines to add, with exact line numbers. Do NOT generate the full code.

For PYTHON:
- Import line: where to add "from handit_ai import tracing, configure"
- Config line: where to add "configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))"
- Decorator line: where to add "@tracing(agent="name")" (ABOVE function definition)

For JAVASCRIPT:
- Import line: where to add the import statement
- Config lines: where to add the configure call
- StartTracing line: INSIDE function body, AFTER opening brace, NOT in parameters
- Try line: wrap existing function content
- Finally lines: BEFORE the function's closing brace

CRITICAL FOR JAVASCRIPT FUNCTIONS:
- NEVER place code in function parameters or signature
- ALWAYS place startTracing INSIDE the function body (after opening brace)
- ALWAYS place finally block BEFORE the function's closing brace
- Look for the opening brace of the target function
- Look for the closing brace of the target function

Return ONLY a JSON object with the exact positions and content:

{
  "additions": [
    {"line": 5, "content": "from handit_ai import tracing, configure"},
    {"line": 6, "content": "import os"},
    {"line": 7, "content": ""},
    {"line": 8, "content": "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))"},
    {"line": 9, "content": ""},
    {"line": 23, "content": "@tracing(agent=\\"agent-name\\")"}
  ]
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    try {
      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not parse AI position detection: ${error.message}`));
      return { additions: [] };
    }
  }

  /**
   * Create prompt for AI position detection
   */
  createPositionDetectionPrompt(fileContent, entryNode, isFastAPIEndpoint) {
    const agentName = this.agentName;
    const language = this.language;
    
    let prompt = 'Analyze this ' + language + ' file and determine EXACT line numbers where to add Handit.ai tracing.\n\n';
    prompt += 'TARGET FUNCTION: ' + entryNode.name + ' (line ' + entryNode.line + ')\n';
    prompt += 'AGENT NAME: ' + agentName + '\n';
    prompt += 'IS FASTAPI ENDPOINT: ' + isFastAPIEndpoint + '\n\n';
    prompt += 'FILE CONTENT:\n```' + language + '\n' + fileContent + '\n```\n\n';

    if (language === 'python') {
      prompt += 'PYTHON REQUIREMENTS:\n';
      prompt += '1. Find where to add imports (after existing imports, before any other code)\n';
      prompt += '2. Find where to add configure call (after imports, before function definitions)\n';
      prompt += '3. Find where to add @tracing decorator (ABOVE the target function definition)\n\n';
      prompt += 'For FastAPI endpoints, the order should be:\n';
      prompt += '@app.post("/path")\n';
      prompt += '@tracing(agent="' + agentName + '")\n';
      prompt += 'def function_name():\n\n';
      prompt += 'For regular functions:\n';
      prompt += '@tracing(agent="' + agentName + '")\n';
      prompt += 'def function_name():\n\n';
      prompt += 'LINES TO ADD:\n';
      prompt += '- "from handit_ai import tracing, configure"\n';
      prompt += '- "import os"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "@tracing(agent=\\"' + agentName + '\\")"\n';
    } else {
      prompt += 'JAVASCRIPT FUNCTION ANALYSIS:\n';
      prompt += 'Target function: ' + entryNode.name + ' on line ' + entryNode.line + '\n\n';
      prompt += 'STEP 1: Find the opening { brace of function ' + entryNode.name + '\n';
      prompt += 'STEP 2: The FIRST line AFTER the opening brace is where startTracing goes\n';
      prompt += 'STEP 3: Find the closing } brace of function ' + entryNode.name + '\n';
      prompt += 'STEP 4: The finally block goes BEFORE the closing brace\n\n';
      
      prompt += 'CRITICAL RULES:\n';
      prompt += '- NEVER modify function signature or parameters\n';
      prompt += '- startTracing goes on the FIRST line INSIDE the function body\n';
      prompt += '- try block wraps ALL existing function content\n';
      prompt += '- finally block goes at the END of the function, BEFORE closing brace\n\n';
      
      prompt += 'EXAMPLE FOR MULTI-LINE FUNCTION:\n';
      prompt += 'async function myFunc(\n';
      prompt += '  param1,\n';
      prompt += '  param2\n';
      prompt += ') {                    // <- Line X: opening brace\n';
      prompt += '  startTracing(...);  // <- Line X+1: ADD HERE\n';
      prompt += '  try {               // <- Line X+2: ADD HERE\n';
      prompt += '    // existing code\n';
      prompt += '  } finally {         // <- Line Y-2: ADD HERE\n';
      prompt += '    endTracing();\n';
      prompt += '  }                   // <- Line Y-1: ADD HERE\n';
      prompt += '}                     // <- Line Y: closing brace\n\n';
      
      prompt += 'LINES TO ADD:\n';
      prompt += '- "import { configure, startTracing, endTracing } from \'@handit.ai/handit-ai\';"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "configure({"\n';
      prompt += '- "  HANDIT_API_KEY: process.env.HANDIT_API_KEY"\n';
      prompt += '- "});"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "  startTracing({ agent: \\"' + agentName + '\\" });"\n';
      prompt += '- "  try {"\n';
      prompt += '- "  } finally {"\n';
      prompt += '- "    endTracing();"\n';
      prompt += '- "  }"\n';
    }

    prompt += '\nReturn the exact line numbers where each piece should be inserted. Use 1-based line numbers.\n';
    
    return prompt;
  }

  /**
   * Show visual diff with the amazing diff viewer
   */
  showVisualDiff(node, originalLines, changes) {
    console.log(chalk.bgBlack.white('─'.repeat(80)));
    console.log(chalk.bgBlack.cyan.bold(`🔍 Code Changes for ${node.name}`));
    console.log(chalk.bgBlack.white('─'.repeat(80)));

    // Summary section
    console.log(chalk.bgBlack.yellow.bold('📊 Summary:'));
    console.log(chalk.bgBlack.green(`  + ${(changes.additions || []).length} lines added`));
    console.log(chalk.bgBlack.red(`  - ${(changes.removals || []).length} lines removed`));

    // Show changes with context
    this.showContextAroundChanges(originalLines, changes);

    console.log(chalk.bgBlack.white('─'.repeat(80)));
  }

  /**
   * Show context around changes (bringing back the amazing diff viewer!)
   */
  showContextAroundChanges(originalLines, changes) {
    const contextLines = 4;
    const additions = changes.additions || [];
    
    if (additions.length === 0) return;
    
    console.log(chalk.bgBlack.yellow.bold('\n📋 Changes:'));
    console.log(chalk.bgBlack.white('─'.repeat(80)));
    
    // Sort changes by line number
    const sortedChanges = [...additions].sort((a, b) => a.line - b.line);
    
    let lastShownLine = -1;
    
    sortedChanges.forEach((change, index) => {
      const lineNumber = change.line; // This is 1-based from AI
      const arrayIndex = lineNumber - 1; // Convert to 0-based for array access
      
      // Show context before change
      const contextStart = Math.max(1, lineNumber - contextLines); // Keep 1-based for display
      const contextEnd = lineNumber;
      
      // Add separator if there's a gap
      if (lastShownLine >= 0 && contextStart > lastShownLine + 1) {
        console.log(chalk.bgBlack.white('   ...'));
      }
      
      // Show context before
      const showContextStart = Math.max(lastShownLine + 1, contextStart);
      for (let displayLine = showContextStart; displayLine < contextEnd; displayLine++) {
        const arrayIdx = displayLine - 1; // Convert to 0-based for array access
        if (arrayIdx >= 0 && arrayIdx < originalLines.length) {
          console.log(chalk.bgBlack.white(`${displayLine.toString().padStart(3)}: ${originalLines[arrayIdx]}`));
        }
      }
      
      // Show the addition
      console.log(chalk.bgGreen.black(`${lineNumber.toString().padStart(3)}: + ${change.content}`));
      
      // Show context after (for last change or if next change is far away)
      const nextChange = sortedChanges[index + 1];
      const shouldShowAfterContext = !nextChange || nextChange.line > lineNumber + contextLines;
      
      if (shouldShowAfterContext) {
        const afterStart = lineNumber; // Start from the line where we added
        const afterEnd = Math.min(originalLines.length, afterStart + contextLines);
        
        for (let displayLine = afterStart; displayLine < afterEnd; displayLine++) {
          const arrayIdx = displayLine - 1; // Convert to 0-based for array access
          if (arrayIdx >= 0 && arrayIdx < originalLines.length) {
            console.log(chalk.bgBlack.white(`${displayLine.toString().padStart(3)}: ${originalLines[arrayIdx]}`));
          }
        }
        lastShownLine = afterEnd - 1;
      } else {
        lastShownLine = lineNumber;
      }
    });
    
    console.log(chalk.bgBlack.white('─'.repeat(80)));
  }

  /**
   * Find the line number of a function in a file
   */
  async findFunctionLine(filePath, functionName) {
    try {
      const fileContent = await fs.readFile(path.resolve(filePath), 'utf8');
      const lines = fileContent.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (this.language === 'python') {
          // Python function detection
          const funcMatch = line.match(/^(?:async\s+)?def\s+(\w+)/);
          if (funcMatch && funcMatch[1] === functionName) {
            return i + 1; // Convert to 1-based line number
          }
        } else {
          // JavaScript function detection
          if (line.includes(`function ${functionName}`) || 
              line.includes(`${functionName} =`) ||
              line.includes(`const ${functionName}`) ||
              line.includes(`let ${functionName}`) ||
              line.includes(`export function ${functionName}`) ||
              line.includes(`export const ${functionName}`)) {
            return i + 1;
          }
        }
      }

      return 1; // Default to line 1 if not found
    } catch (error) {
      return 1;
    }
  }

  /**
   * Get original function code from file
   */
  async getOriginalFunctionCode(node) {
    try {
      const filePath = path.resolve(node.file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n');

      const startLine = node.line - 1; // Convert to 0-based
      let endLine = startLine;

      if (this.language === 'python') {
        endLine = this.findPythonFunctionEnd(lines, startLine);
      } else {
        endLine = this.findJavaScriptFunctionEnd(lines, startLine);
      }

      if (endLine === startLine) {
        endLine = Math.min(startLine + 20, lines.length - 1);
      }

      return lines.slice(startLine, endLine + 1).join('\n');
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read function code for ${node.name}: ${error.message}`));
      return `// Original function: ${node.name}`;
    }
  }

  /**
   * Find the end of a Python function based on indentation
   */
  findPythonFunctionEnd(lines, startLine) {
    const functionLine = lines[startLine];
    const functionIndentation = this.getIndentationLevel(functionLine);

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineIndentation = this.getIndentationLevel(line);

      if (line.trim() === '') continue;

      if (lineIndentation <= functionIndentation && 
          !line.startsWith('def ') && 
          !line.startsWith('async def ') &&
          !line.startsWith(')')) {
        return i - 1;
      }
    }

    return lines.length - 1;
  }

  /**
   * Find the end of a JavaScript function based on braces
   */
  findJavaScriptFunctionEnd(lines, startLine) {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction && (line.includes('function') || line.includes('=>'))) {
        inFunction = true;
      }

      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && i > startLine) {
          return i;
        }
      }
    }

    return startLine;
  }

  /**
   * Get the indentation level of a line
   */
  getIndentationLevel(line) {
    const trimmed = line.trim();
    if (trimmed === '') return 0;
    return line.length - line.trimStart().length;
  }

  /**
   * Detect if the function is a FastAPI endpoint
   */
  async detectFastAPIEndpoint(node) {
    try {
      const filePath = path.resolve(node.file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      const functionLineIndex = node.line - 1;
      if (functionLineIndex > 0) {
        const previousLine = lines[functionLineIndex - 1];
        const decoratorMatch = previousLine.match(/^@(\w+)\.(post|get|put|delete|patch)\s*\(/);
        return !!decoratorMatch;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Apply the AI-detected changes to the file
   */
  async applySimpleChanges(node, originalLines, changes) {
    try {
      const filePath = path.resolve(node.file);
      let newLines = [...originalLines];
      
      const additions = changes.additions || [];
      
      if (additions.length === 0) {
        console.log(chalk.yellow('No changes to apply'));
        return;
      }
      
      // Apply additions in reverse order to maintain line numbers
      // Convert from 1-based to 0-based line numbers
      const sortedAdditions = [...additions]
        .map(addition => ({
          ...addition,
          line: addition.line - 1 // Convert to 0-based
        }))
        .sort((a, b) => b.line - a.line);
      
      for (const addition of sortedAdditions) {
        newLines.splice(addition.line, 0, addition.content);
      }
      
      await fs.writeFile(filePath, newLines.join('\n'));
      console.log(chalk.green(`✓ Applied tracing to ${node.file}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error applying tracing to ${node.file}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Show setup instructions
   */
  showSetupInstructions() {
    console.log(chalk.yellow.bold('\n📋 Setup Instructions:'));
    console.log(chalk.gray('1. Install Handit.ai SDK:'));
    
    if (this.language === 'javascript') {
      console.log(chalk.white('   npm i @handit.ai/handit-ai'));
    } else {
      console.log(chalk.white('   pip install handit_ai'));
    }
    
    console.log(chalk.gray('2. Set your Handit API key:'));
    if (this.apiToken) {
      console.log(chalk.white(`   export HANDIT_API_KEY="${this.apiToken}"`));
    } else {
      console.log(chalk.white('   export HANDIT_API_KEY="your-api-key-here"'));
    }
    
    console.log(chalk.gray('3. Run your agent to start collecting traces'));
    console.log(chalk.gray('4. View traces in your Handit dashboard\n'));
  }
}

module.exports = { SimplifiedCodeGenerator };
