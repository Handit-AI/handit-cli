const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { callLLMAPI } = require('../utils/openai');
const { showInkDiffViewer } = require('../ui/InkDiffViewer');

/**
 * Debug logger for code generation
 */
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;

  // Try console.log first (might work in some contexts)
  try {
    console.log(logMessage);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    // Console might not be available in Ink context
  }

  // Always write to debug file
  try {
    const debugFile = path.join(__dirname, '../../debug-code-generation.log');
    const logEntry = data
      ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n---\n`
      : `${logMessage}\n---\n`;

    fs.appendFileSync(debugFile, logEntry);
  } catch (e) {
    // If we can't write to file, at least try to write to stderr
    try {
      process.stderr.write(logMessage + '\n');
    } catch (e2) {
      // Last resort - do nothing
    }
  }
}

/**
 * Simplified code generator that only instruments the entry point using AI
 */
class SimplifiedCodeGenerator {
  constructor(
    language,
    agentName,
    projectRoot,
    apiToken = null,
    stagingApiToken = null
  ) {
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
    console.log(
      chalk.gray('Using AI to add tracing to your entry point function...\n')
    );

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
        console.log(
          chalk.yellow('⚠️  Handit integration already exists, skipping...')
        );
        return { applied: false };
      }

      // Use AI to generate the complete modified file
      const modifiedContent = await this.addHanditIntegrationToFile(
        fileContent,
        entryFile,
        entryFunction,
        this.agentName
      );

      // Show visual diff and get user confirmation
      const shouldApply = await this.showVisualDiffAI(
        fileContent,
        modifiedContent,
        entryFile
      );

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
      console.error(
        chalk.red(`❌ Error generating entry point tracing: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Add handit integration to file content using AI-powered code modification
   */
  async addHanditIntegrationToFile(content, filePath, functionName, agentName, lineNumber) {
    const fileExtension = filePath.split('.').pop().toLowerCase();

    if (!['py', 'js', 'ts', 'jsx', 'tsx'].includes(fileExtension)) {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    const agentNameForCode = agentName || functionName;

    const prompt = `You are a code editor that adds Handit.ai monitoring to existing code files. Your task is to integrate monitoring into a specific function while preserving all existing code exactly as-is.

CRITICAL: Return ONLY a JSON array of change objects. Each object should have:
- "type": "add" or "remove" or "replace"
- "content": the exact code content to add/remove/replace (with CORRECT INDENTATION)
- "line": the line number where to make the change (for add/remove)
- "originalLine": the original line content to replace (for replace type)
- Start your index at 1, not 0.

Do not include explanations, comments, or instructions. Return only the JSON array. Give the changes line by line, do not group them together using \\n or anything else, if they are in a different line, give them a different line number. Also give the original line numbers, do not guess or move the lines based on the target file, just give the position that they will take in the original file, without thinking on other changes.

CRITICAL INDENTATION RULES:
- Python: Use EXACT same indentation as surrounding code (spaces or tabs)
- JavaScript/TypeScript: Use EXACT same indentation as surrounding code
- Preserve ALL whitespace, spacing, and line breaks exactly as they appear
- For decorators: match the indentation level of the function they decorate
- For try/catch blocks: match the indentation level of the function body

NEVER MODIFY: 
- Existing function logic, variable names, or signatures
- Existing imports, comments, or documentation  
- Indentation or formatting of existing code
- Return statements or code flow

ONLY ADD: Handit monitoring imports, configuration, and tracing

PYTHON IMPLEMENTATION:

Add these exact elements:

1. Imports (after existing imports):
from handit_ai import configure, tracing
import os

2. Configuration (after imports):
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

3. Function Decorator:
   - Standard functions: @tracing(agent="${agentName}") directly before function
   - FastAPI/Flask routes: @tracing(agent="${agentName}") AFTER route decorator, BEFORE function

JAVASCRIPT/TYPESCRIPT IMPLEMENTATION:

Add these exact elements:

1. Import (after existing imports):
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

2. Configuration (after imports):
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

3. Function Tracing (inside target function):
startTracing({ agent: "${agentName}" });
try {
  // existing function body stays exactly the same
} finally {
  endTracing();
}

EXAMPLES:

Python Route Handler - Return this JSON array (NOTE: Preserve exact indentation):
[
  {"type": "add", "content": "from handit_ai import configure, tracing\\nimport os", "line": 1},
  {"type": "add", "content": "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))", "line": 4},
  {"type": "add", "content": "@tracing(agent=\\"ProcessAgent\\")", "line": 7}
]

Python Function with proper indentation:
[
  {"type": "add", "content": "from handit_ai import configure, tracing", "line": 1},
  {"type": "add", "content": "configure(HANDIT_API_KEY=os.getenv(\\"HANDIT_API_KEY\\"))", "line": 3},
  {"type": "replace", "content": "@tracing(agent=\\"ProcessAgent\\")\\ndef process_data(data):\\n    startTracing({ agent: \\"ProcessAgent\\" })\\n    try:\\n        result = analyze(data)\\n        return result\\n    finally:\\n        endTracing()", "originalLine": "def process_data(data):\\n    result = analyze(data)\\n    return result"}
]

JavaScript Function - Return this JSON array:
[
  {"type": "add", "content": "import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';", "line": 1},
  {"type": "add", "content": "configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });", "line": 3},
  {"type": "replace", "content": "startTracing({ agent: \\"ProcessAgent\\" });\\n  try {\\n    const result = await analyze(input);\\n    return result;\\n  } finally {\\n    endTracing();\\n  }", "originalLine": "const result = await analyze(input);\\n  return result;"}
]
`;

// Add line numbers to the content for better AI understanding
const contentWithLineNumbers = content
  .split('\n')
  .map((line, index) => `${(index + 1).toString().padStart(3, ' ')}| ${line}`)
  .join('\n');

const userPrompt = `Add Handit.ai monitoring to function "${functionName}" that starts at line ${lineNumber}, only add handit to that exact function, also only add handit imports after user imports with agent name "${agentNameForCode}".

File content (with line numbers):
\`\`\`
${contentWithLineNumbers}
\`\`\``;

    // Use AI to properly integrate handit monitoring
    const messages = [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      const response = await callLLMAPI({
        messages,
        model: 'claude-sonnet-4-20250514',
        provider: 'Anthropic',
      });

      if (
        !response ||
        !response.choices ||
        !response.choices[0] ||
        !response.choices[0].message
      ) {
        throw new Error('Invalid response structure from LLM API');
      }

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

      // Parse the JSON array of changes
      let changes;
      try {
        changes = JSON.parse(result);
        if (!Array.isArray(changes)) {
          throw new Error('Response is not an array');
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        console.error('Raw response:', result);
        throw new Error('AI returned invalid JSON array format');
      }

      // Reconstruct the file with the changes
      const modifiedContent = this.reconstructFileWithChanges(content, changes, fileExtension, functionName, filePath);

      console.log(
        chalk.gray(`✅ AI-generated handit integration for ${filePath}`)
      );

      return modifiedContent;
    } catch (error) {
      console.error('Error using AI for code modification:', error);
      throw new Error(`AI code generation failed: ${error.message}`);
    }
  }

  /**
   * Reconstruct file content from array of changes
   */
  reconstructFileWithChanges(originalContent, changes, fileExtension) {
    const originalLines = originalContent.split('\n');
    let targetLines = [...originalLines]; // Working copy

    // Sort changes by line number to process them in order
    const sortedChanges = [...changes].sort((a, b) => a.line - b.line);


    // Track cumulative line shifts from previous additions
    let cumulativeLineShift = 0;
    let lastProcessedLine = 0;

    // Process changes in order
    for (const change of sortedChanges) {
      if (change.type === 'add') {
        // Only apply cumulative shift if there's a gap from the last processed line
        // For consecutive additions (17, 18, 19), don't shift
        // For non-consecutive additions (17, 19, 72), apply shift
        const hasGap = change.line > lastProcessedLine + 1;
        const adjustedLine = hasGap ? change.line + cumulativeLineShift : change.line;
        const insertIndex = Math.max(0, Math.min(adjustedLine - 1, targetLines.length));
        const contentLines = change.content.split('\n');
        
        // Insert the new lines
        targetLines.splice(insertIndex, 0, ...contentLines);
        
        // Update cumulative shift and last processed line
        cumulativeLineShift += contentLines.length;
        lastProcessedLine = change.line;
        
        
      } else if (change.type === 'remove') {
        // Adjust line number based on previous additions
        const adjustedLine = change.line + cumulativeLineShift;
        const removeIndex = adjustedLine - 1;
        
        if (removeIndex >= 0 && removeIndex < targetLines.length) {
          const removedLine = targetLines.splice(removeIndex, 1)[0];
          
          // Update cumulative shift (removing reduces the shift)
          cumulativeLineShift -= 1;
          
        }
        
      } else if (change.type === 'replace') {
        // For replace operations, we don't change line count, so no shift adjustment needed
        const targetIndex = targetLines.findIndex(line => 
          line.trim() === change.originalLine.trim()
        );
        
        if (targetIndex !== -1) {
          const newContentLines = change.content.split('\n');
          targetLines.splice(targetIndex, 1, ...newContentLines);
          
        }
      }
    }

    const result = targetLines.join('\n');


    return result;
  }

  /**
   * Add content at specific line number
   */
  addContentAtLine(lines, content, lineNumber) {
    const contentLines = content.split('\n');
    let result = [...lines];
    
    // Convert to 0-based index and ensure valid range
    const insertIndex = Math.max(0, Math.min(lineNumber - 1, result.length));
    
    result.splice(insertIndex, 0, ...contentLines);
    return result;
  }

  /**
   * Remove content at specific line number
   */
  removeContentAtLine(lines, content, lineNumber) {
    let result = [...lines];
    const lineIndex = lineNumber - 1;
    
    if (lineIndex >= 0 && lineIndex < result.length) {
      result.splice(lineIndex, 1);
    }
    
    return result;
  }

  /**
   * Replace content by finding and replacing original line content
   */
  replaceContentAtLine(lines, newContent, originalLine) {
    let result = [...lines];
    
    // Find the line with the original content
    const targetIndex = result.findIndex(line => line.trim() === originalLine.trim());
    
    if (targetIndex !== -1) {
      // Replace the line with new content
      const newContentLines = newContent.split('\n');
      result.splice(targetIndex, 1, ...newContentLines);
    }
    
    return result;
  }


  /**
   * Show visual diff between original and AI-generated content
   */
  async showVisualDiffAI(originalContent, modifiedContent, filePath) {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');

    // Use a smarter diff algorithm
    // Clean up the lines to avoid undefined issues
    const cleanOriginalLines = originalLines.map((line) => line || '');
    const cleanModifiedLines = modifiedLines.map((line) => line || '');
    const changes = this.computeSmartDiff(
      cleanOriginalLines,
      cleanModifiedLines
    );

    // Create a better diff that accounts for line shifting
    const betterChanges = this.createBetterDiff(originalLines, modifiedLines);
    
    // Show the beautiful Ink-based diff viewer
    return await showInkDiffViewer(filePath, betterChanges);
  }

  /**
   * Create a better diff that properly handles line shifting for additions
   */
  createBetterDiff(originalLines, modifiedLines) {
    const changes = [];
    let originalIndex = 0;
    let modifiedIndex = 0;
    let lineNumber = 1;

    while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
      const originalLine = originalIndex < originalLines.length ? originalLines[originalIndex] : null;
      const modifiedLine = modifiedIndex < modifiedLines.length ? modifiedLines[modifiedIndex] : null;

      if (originalLine === null) {
        // Only modified lines left - these are additions
        changes.push({
          type: 'add',
          line: lineNumber,
          content: modifiedLine,
          originalLine: null,
        });
        modifiedIndex++;
        lineNumber++;
      } else if (modifiedLine === null) {
        // Only original lines left - these are removals
        changes.push({
          type: 'remove',
          line: lineNumber,
          content: originalLine,
          modifiedLine: null,
        });
        originalIndex++;
        lineNumber++;
      } else if (originalLine === modifiedLine) {
        // Lines match, advance both
        originalIndex++;
        modifiedIndex++;
        lineNumber++;
      } else {
        // Check if this is an addition by looking ahead in modified lines
        let foundMatch = false;
        
        // Look ahead up to 5 lines to see if we can find a match
        for (let lookAhead = 1; lookAhead <= 5 && modifiedIndex + lookAhead < modifiedLines.length; lookAhead++) {
          if (originalLine === modifiedLines[modifiedIndex + lookAhead]) {
            // Found match - the lines between are additions
            for (let i = 0; i < lookAhead; i++) {
              changes.push({
                type: 'add',
                line: lineNumber + i,
                content: modifiedLines[modifiedIndex + i],
                originalLine: null,
              });
            }
            modifiedIndex += lookAhead;
            lineNumber += lookAhead;
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          // Check if this is a removal by looking ahead in original lines
          for (let lookAhead = 1; lookAhead <= 5 && originalIndex + lookAhead < originalLines.length; lookAhead++) {
            if (modifiedLine === originalLines[originalIndex + lookAhead]) {
              // Found match - the lines between are removals
              for (let i = 0; i < lookAhead; i++) {
                changes.push({
                  type: 'remove',
                  line: lineNumber + i,
                  content: originalLines[originalIndex + i],
                  modifiedLine: null,
                });
              }
              originalIndex += lookAhead;
              lineNumber += lookAhead;
              foundMatch = true;
              break;
            }
          }
        }

        if (!foundMatch) {
          // This is a modification
          changes.push({
            type: 'modify',
            line: lineNumber,
            content: originalLine,
            modifiedContent: modifiedLine,
          });
          originalIndex++;
          modifiedIndex++;
          lineNumber++;
        }
      }
    }

    return changes;
  }

  /**
   * Compute a smart diff that groups actual changes
   */
  computeSmartDiff(originalLines, modifiedLines) {
    const changes = [];
    let i = 0,
      j = 0;

    while (i < originalLines.length || j < modifiedLines.length) {
      const originalLine =
        i < originalLines.length ? originalLines[i] : undefined;
      const modifiedLine =
        j < modifiedLines.length ? modifiedLines[j] : undefined;

      if (i >= originalLines.length) {
        // Only modified lines left
        changes.push({
          type: 'add',
          line: j + 1,
          content: modifiedLine || '', // Handle undefined/empty lines
          originalLine: null,
        });
        j++;
      } else if (j >= modifiedLines.length) {
        // Only original lines left
        changes.push({
          type: 'remove',
          line: i + 1,
          content: originalLine || '', // Handle undefined/empty lines
          modifiedLine: null,
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
              const lineContent =
                lineIndex < originalLines.length
                  ? originalLines[lineIndex]
                  : '';
              changes.push({
                type: 'add',
                line: j + 1,
                content: lineContent,
                originalLine: null,
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
                const lineContent =
                  lineIndex < modifiedLines.length
                    ? modifiedLines[lineIndex]
                    : '';
                changes.push({
                  type: 'add',
                  line: i + 1,
                  content: lineContent,
                  modifiedLine: null,
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
            modifiedContent: modifiedLine || '', // Handle undefined/empty lines
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
        console.log(
          chalk.gray(`  ${i.toString().padStart(3)}: ${lineContent}`)
        );
      }

      // Show changes
      group.changes.forEach((change) => {
        if (change.type === 'add') {
          console.log(
            chalk.green(
              `+ ${change.line.toString().padStart(3)}: ${change.content}`
            )
          );
        } else if (change.type === 'remove') {
          console.log(
            chalk.red(
              `- ${change.line.toString().padStart(3)}: ${change.content}`
            )
          );
        } else if (change.type === 'modify') {
          console.log(
            chalk.red(
              `- ${change.line.toString().padStart(3)}: ${change.content}`
            )
          );
          console.log(
            chalk.green(
              `+ ${change.line.toString().padStart(3)}: ${change.modifiedContent}`
            )
          );
        }
      });

      // Show context after changes
      for (let i = group.endLine + 1; i <= endLine; i++) {
        const lineContent = originalLines[i - 1] || '';
        console.log(
          chalk.gray(`  ${i.toString().padStart(3)}: ${lineContent}`)
        );
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
      endLine: changes[0].line,
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
          endLine: change.line,
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
    console.log(
      chalk.green.bold('\n🎉 Congratulations! Your agent is now connected!')
    );
    console.log(chalk.gray('─'.repeat(60)));

    if (this.language === 'python') {
      console.log(chalk.yellow('📦 Install the Python SDK:'));
      console.log(chalk.white('   pip install handit_ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key in your environment:'));
      console.log(chalk.white('   # Add to your .env file or export directly'));
      console.log(
        chalk.white(
          `   export HANDIT_API_KEY=${this.stagingApiToken || this.apiToken || 'your_api_key_here'}`
        )
      );
      console.log('');
      console.log(chalk.yellow('🚀 Run your agent:'));
      console.log(chalk.white('   python your_agent_file.py'));
    } else {
      console.log(chalk.yellow('📦 Install the JavaScript SDK:'));
      console.log(chalk.white('   npm install @handit.ai/handit-ai'));
      console.log('');
      console.log(chalk.yellow('🔑 Set your API key in your environment:'));
      console.log(chalk.white('   # Add to your .env file or export directly'));
      console.log(
        chalk.white(
          `   export HANDIT_API_KEY=${this.stagingApiToken || this.apiToken || 'your_api_key_here'}`
        )
      );
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
    console.log(
      chalk.green(
        '✅ Your agent is now instrumented with handit.ai monitoring!'
      )
    );
    console.log(
      chalk.gray(
        '   Traces will appear in your dashboard at https://dashboard.handit.ai'
      )
    );
    console.log(chalk.gray('─'.repeat(60)));
  }

  getSetupInstructions() {
    const instructions = {
      title: '🎉 Congratulations! Your agent is now connected to Handit!',
      language: this.language,
      apiKey: this.stagingApiToken || this.apiToken || 'your_api_key_here',
      stagingApiToken: this.stagingApiToken || 'Not available',
      productionApiToken: this.apiToken || 'Not available',
    };

    if (this.language === 'python') {
      instructions.sdkInstall = 'pip install handit_ai';
      instructions.runCommand = 'python your_agent_file.py';
    } else {
      instructions.sdkInstall = 'npm install @handit.ai/handit-ai';
      instructions.runCommand = 'node your_agent_file.js';
    }

    return instructions;
  }
}

module.exports = { SimplifiedCodeGenerator };
