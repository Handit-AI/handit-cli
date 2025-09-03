const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer').default;
const ora = require('ora').default;
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

      // Get complete function info for JavaScript
      let functionInfo = null;
      if (this.language === 'javascript') {
        functionInfo = await this.getFunctionInfo(entryFile, entryFunction);
        if (functionInfo) {
          console.log(chalk.gray(`Function body: lines ${functionInfo.bodyStartLine}-${functionInfo.bodyEndLine}`));
        }
      }

      // Detect where to add tracing
      const detectionSpinner = ora('Detecting changes to apply...').start();
      const changes = await this.detectPositionsWithAI(lines, entryNode, isFastAPIEndpoint, functionInfo);
      detectionSpinner.succeed('Changes detected');

      // Show visual diff with the amazing diff viewer
      this.showVisualDiff(entryNode, lines, changes);

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
   * Smart detection - AI for Python, programmatic for JavaScript
   */
  async detectPositionsWithAI(lines, entryNode, isFastAPIEndpoint, functionInfo = null) {
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

    if (this.language === 'python') {
      // Use AI for Python (simpler, just decorator)
      return await this.detectPythonPositionsWithAI(lines, entryNode, isFastAPIEndpoint);
    } else {
      // Use programmatic approach for JavaScript (complex transformation)
      return await this.detectJavaScriptPositionsProgrammatically(lines, entryNode, functionInfo);
    }
  }

  /**
   * Use AI for Python position detection (simple decorator placement)
   */
  async detectPythonPositionsWithAI(lines, entryNode, isFastAPIEndpoint) {
    const fileContent = lines.join('\n');
    const agentName = this.agentName;
    
    const prompt = `
Analyze this Python file and find where to add Handit.ai tracing.

TARGET FUNCTION: ${entryNode.name} (line ${entryNode.line})
AGENT NAME: ${agentName}
IS FASTAPI ENDPOINT: ${isFastAPIEndpoint}

FILE CONTENT:
\`\`\`python
${fileContent}
\`\`\`

REQUIREMENTS:
1. Find where to add imports (after existing imports)
2. Add @tracing decorator ABOVE the target function definition

LINES TO ADD:
- "from handit_ai import tracing, configure"
- "import os"
- "" (empty line)
- "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))"
- "" (empty line)  
- "@tracing(agent=\\"${agentName}\\")"

Return exact line numbers where each piece should be inserted (1-based).
`;

    const response = await callLLMAPI({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at Python code analysis. Find exact line numbers where to add imports and decorators. Return only a JSON object with additions array.',
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
      console.warn(chalk.yellow(`Warning: Could not parse Python position detection: ${error.message}`));
      return { additions: [] };
    }
  }

  /**
   * Use smart function replacement for JavaScript (much safer)
   */
  async detectJavaScriptPositionsProgrammatically(lines, entryNode, functionInfo) {
    const changes = { 
      additions: [],
      replacements: [] // New type for complete function replacement
    };
    const agentName = this.agentName;

    if (!functionInfo) {
      console.warn(chalk.yellow('Warning: Could not analyze JavaScript function structure'));
      return changes;
    }

    // Step 1: Add imports at the top
    const importLine = this.findImportInsertionPoint(lines);
    changes.additions.push({ line: importLine, content: "import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';" });
    changes.additions.push({ line: importLine + 1, content: '' });
    changes.additions.push({ line: importLine + 2, content: 'configure({' });
    changes.additions.push({ line: importLine + 3, content: '  HANDIT_API_KEY: process.env.HANDIT_API_KEY' });
    changes.additions.push({ line: importLine + 4, content: '});' });
    changes.additions.push({ line: importLine + 5, content: '' });

    // Step 2: Create complete function replacement
    const functionReplacement = await this.createJavaScriptFunctionReplacement(lines, entryNode, functionInfo, agentName);
    
    changes.replacements = [{
      startLine: functionInfo.functionStartLine,
      endLine: functionInfo.bodyEndLine,
      newContent: functionReplacement
    }];

    return changes;
  }

  /**
   * Create a complete replacement for the JavaScript function with proper tracing
   */
  async createJavaScriptFunctionReplacement(lines, entryNode, functionInfo, agentName) {
    // Extract function signature (everything before the opening brace)
    const functionStart = functionInfo.functionStartLine - 1; // Convert to 0-based
    const bodyStart = functionInfo.bodyStartLine - 1; // Convert to 0-based
    const bodyEnd = functionInfo.bodyEndLine - 1; // Convert to 0-based

    // Get function signature lines
    const signatureLines = [];
    for (let i = functionStart; i < bodyStart; i++) {
      signatureLines.push(lines[i]);
    }

    // Get existing function body content (without braces)
    const bodyContent = [];
    for (let i = bodyStart; i < bodyEnd; i++) {
      const line = lines[i];
      if (line.trim() !== '') {
        bodyContent.push(line);
      } else {
        bodyContent.push('');
      }
    }

    // Create new function with tracing
    const newFunction = [];
    
    // Add function signature
    newFunction.push(...signatureLines);
    newFunction.push('{'); // Opening brace
    
    // Add tracing
    newFunction.push(`  startTracing({ agent: "${agentName}" });`);
    newFunction.push('  try {');
    
    // Add existing body content with proper indentation
    bodyContent.forEach(line => {
      if (line.trim() === '') {
        newFunction.push('');
      } else {
        // Add 2 more spaces for the try block indentation
        newFunction.push('  ' + line);
      }
    });
    
    // Add finally block
    newFunction.push('  } finally {');
    newFunction.push('    endTracing();');
    newFunction.push('  }');
    newFunction.push('}'); // Closing brace

    return newFunction;
  }

  /**
   * Find where to insert imports (after existing imports)
   */
  findImportInsertionPoint(lines) {
    let lastImportLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.language === 'python') {
        if (line.startsWith('import ') || line.startsWith('from ')) {
          lastImportLine = i;
        } else if (line && !line.startsWith('#') && lastImportLine >= 0) {
          break;
        }
      } else {
        if (line.startsWith('import ') || line.startsWith('const ') || line.startsWith('require(')) {
          lastImportLine = i;
        } else if (line && !line.startsWith('//') && lastImportLine >= 0) {
          break;
        }
      }
    }

    return lastImportLine + 1;
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
    const additions = (changes.additions || []).length;
    const replacements = (changes.replacements || []).length;
    console.log(chalk.bgBlack.green(`  + ${additions} lines added`));
    if (replacements > 0) {
      console.log(chalk.bgBlack.blue(`  ~ ${replacements} functions modified`));
    }

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
    const replacements = changes.replacements || [];
    
    console.log(chalk.bgBlack.yellow.bold('\n📋 Changes:'));
    console.log(chalk.bgBlack.white('─'.repeat(80)));
    
    // Show additions (imports)
    if (additions.length > 0) {
      console.log(chalk.bgBlack.cyan('📥 Imports and Configuration:'));
      const sortedChanges = [...additions].sort((a, b) => a.line - b.line);
      
      sortedChanges.forEach(change => {
        console.log(chalk.bgGreen.black(`${change.line.toString().padStart(3)}: + ${change.content}`));
      });
      
      if (replacements.length > 0) {
        console.log(chalk.bgBlack.white('   ...'));
      }
    }
    
    // Show function replacements
    if (replacements.length > 0) {
      const replacement = replacements[0];
      console.log(chalk.bgBlack.cyan('Function Transformation:'));
      
      // Show a few lines before the function
      const startLine = replacement.startLine;
      const contextStart = Math.max(1, startLine - 2);
      for (let i = contextStart; i < startLine; i++) {
        const arrayIdx = i - 1;
        if (arrayIdx >= 0 && arrayIdx < originalLines.length) {
          console.log(chalk.bgBlack.white(`${i.toString().padStart(3)}: ${originalLines[arrayIdx]}`));
        }
      }
      
      // Show the new function content
      replacement.newContent.forEach((line, index) => {
        const lineNum = startLine + index;
        console.log(chalk.bgBlue.white(`${lineNum.toString().padStart(3)}: ~ ${line}`));
      });
      
      // Show a few lines after
      const endLine = startLine + replacement.newContent.length;
      const contextEnd = Math.min(originalLines.length, endLine + 2);
      for (let i = endLine; i < contextEnd; i++) {
        const arrayIdx = i - 1;
        if (arrayIdx >= 0 && arrayIdx < originalLines.length) {
          console.log(chalk.bgBlack.white(`${i.toString().padStart(3)}: ${originalLines[arrayIdx]}`));
        }
      }
    }
    
    console.log(chalk.bgBlack.white('─'.repeat(80)));
  }

  /**
   * Create prompt for AI position detection with function info
   */
  createPositionDetectionPrompt(fileContent, entryNode, isFastAPIEndpoint, functionInfo = null) {
    const agentName = this.agentName;
    const language = this.language;
    const functionName = entryNode.name;
    const functionLine = entryNode.line;
    
    let prompt = 'Analyze this ' + language + ' file and determine EXACT line numbers where to add Handit.ai tracing.\n\n';
    prompt += 'TARGET FUNCTION: ' + functionName + ' (line ' + functionLine + ')\n';
    prompt += 'AGENT NAME: ' + agentName + '\n';
    prompt += 'IS FASTAPI ENDPOINT: ' + isFastAPIEndpoint + '\n';
    
    if (functionInfo && language === 'javascript') {
      prompt += 'FUNCTION BODY INFO:\n';
      prompt += '- Function starts at line: ' + functionInfo.functionStartLine + '\n';
      prompt += '- Function body starts at line: ' + functionInfo.bodyStartLine + ' (FIRST line inside function)\n';
      prompt += '- Function body ends at line: ' + functionInfo.bodyEndLine + ' (line with closing brace)\n';
    }
    
    prompt += '\nFILE CONTENT:\n```' + language + '\n' + fileContent + '\n```\n\n';

    if (language === 'python') {
      prompt += 'PYTHON REQUIREMENTS:\n';
      prompt += '1. Find where to add imports (after existing imports, before any other code)\n';
      prompt += '2. Find where to add configure call (after imports, before function definitions)\n';
      prompt += '3. Find where to add @tracing decorator (ABOVE the target function definition)\n\n';
      
      prompt += 'LINES TO ADD:\n';
      prompt += '- "from handit_ai import tracing, configure"\n';
      prompt += '- "import os"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))"\n';
      prompt += '- "" (empty line)\n';
      prompt += '- "@tracing(agent=\\"' + agentName + '\\")"\n';
    } else {
      prompt += 'JAVASCRIPT CODE TRANSFORMATION:\n';
      prompt += 'Target function: ' + functionName + '\n\n';
      
      if (functionInfo) {
        prompt += 'FUNCTION STRUCTURE ANALYSIS:\n';
        prompt += '- Function starts at line: ' + functionInfo.functionStartLine + '\n';
        prompt += '- Function body starts at line: ' + functionInfo.bodyStartLine + ' (first line inside function)\n';
        prompt += '- Function body ends at line: ' + functionInfo.bodyEndLine + ' (line with closing brace)\n\n';
      }
      
      prompt += 'INTELLIGENT TRANSFORMATION REQUIRED:\n';
      prompt += '1. Add imports at the top of the file\n';
      prompt += '2. Add configure call after imports\n';
      prompt += '3. Transform the function body to wrap existing code with try/finally\n\n';
      
      prompt += 'JAVASCRIPT TRANSFORMATION RULES:\n';
      prompt += '- Preserve ALL existing function logic exactly\n';
      prompt += '- Add startTracing as the FIRST statement inside function body\n';
      prompt += '- Wrap ALL existing function content in try block\n';
      prompt += '- Add finally block with endTracing at the end\n';
      prompt += '- Maintain proper indentation (2 spaces for each level)\n';
      prompt += '- Ensure all braces are properly matched\n\n';
      
      prompt += 'TRANSFORMATION EXAMPLE:\n';
      prompt += 'BEFORE:\n';
      prompt += 'async function myFunc(param1, param2) {\n';
      prompt += '  const result = await doSomething();\n';
      prompt += '  return result;\n';
      prompt += '}\n\n';
      
      prompt += 'AFTER:\n';
      prompt += 'async function myFunc(param1, param2) {\n';
      prompt += '  startTracing({ agent: "' + agentName + '" });\n';
      prompt += '  try {\n';
      prompt += '    const result = await doSomething();\n';
      prompt += '    return result;\n';
      prompt += '  } finally {\n';
      prompt += '    endTracing();\n';
      prompt += '  }\n';
      prompt += '}\n\n';
      
      prompt += 'PROVIDE EXACT LINES TO ADD/MODIFY:\n';
      prompt += '- Import lines (at top of file)\n';
      prompt += '- Configure lines (after imports)\n';
      prompt += '- startTracing line (first line in function body)\n';
      prompt += '- try block opening (second line in function body)\n';
      prompt += '- Indented existing content (all current function content with +2 spaces)\n';
      prompt += '- finally block (before function closing brace)\n';
      prompt += '- endTracing call (inside finally block)\n';
      prompt += '- finally closing brace\n';
    }

    prompt += '\nReturn the exact line numbers where each piece should be inserted. Use 1-based line numbers.\n';
    
    return prompt;
  }

  /**
   * Find the line number of a function in a file and get complete function info
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
   * Get complete function info including body start and end for JavaScript
   */
  async getFunctionInfo(filePath, functionName) {
    try {
      const fileContent = await fs.readFile(path.resolve(filePath), 'utf8');
      const lines = fileContent.split('\n');
      
      let functionStartLine = -1;
      let bodyStartLine = -1;
      let bodyEndLine = -1;
      
      // Find function start
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(`function ${functionName}`) || 
            line.includes(`${functionName} =`) ||
            line.includes(`const ${functionName}`) ||
            line.includes(`let ${functionName}`) ||
            line.includes(`export function ${functionName}`) ||
            line.includes(`export const ${functionName}`)) {
          functionStartLine = i;
          break;
        }
      }
      
      if (functionStartLine === -1) {
        return null;
      }
      
      // Find opening brace (function body start)
      let braceCount = 0;
      for (let i = functionStartLine; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('{')) {
          bodyStartLine = i + 1; // First line inside the function body
          braceCount = 1;
          break;
        }
      }
      
      // Find closing brace (function body end)
      if (bodyStartLine > -1) {
        for (let i = bodyStartLine; i < lines.length; i++) {
          const line = lines[i];
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          if (braceCount === 0) {
            bodyEndLine = i; // Line with the closing brace
            break;
          }
        }
      }
      
      return {
        functionStartLine: functionStartLine + 1, // Convert to 1-based
        bodyStartLine: bodyStartLine + 1, // Convert to 1-based
        bodyEndLine: bodyEndLine + 1 // Convert to 1-based
      };
      
    } catch (error) {
      return null;
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
   * Apply the changes to the file (additions + function replacements)
   */
  async applySimpleChanges(node, originalLines, changes) {
    try {
      const filePath = path.resolve(node.file);
      let newLines = [...originalLines];
      
      const additions = changes.additions || [];
      const replacements = changes.replacements || [];
      
      if (additions.length === 0 && replacements.length === 0) {
        console.log(chalk.yellow('No changes to apply'));
        return;
      }
      
      // Step 1: Apply function replacements first (for JavaScript)
      if (replacements.length > 0) {
        const replacement = replacements[0]; // Should only be one
        const startLine = replacement.startLine - 1; // Convert to 0-based
        const endLine = replacement.endLine - 1; // Convert to 0-based
        const linesToReplace = endLine - startLine + 1;
        
        // Replace the entire function
        newLines.splice(startLine, linesToReplace, ...replacement.newContent);
      }
      
      // Step 2: Apply additions (imports) in reverse order to maintain line numbers
      if (additions.length > 0) {
        const sortedAdditions = [...additions]
          .map(addition => ({
            ...addition,
            line: addition.line - 1 // Convert to 0-based
          }))
          .sort((a, b) => b.line - a.line);
        
        for (const addition of sortedAdditions) {
          newLines.splice(addition.line, 0, addition.content);
        }
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
