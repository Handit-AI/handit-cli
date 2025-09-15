const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { CodeGenerator } = require('./codeGenerator');

/**
 * Iterative code generation with visual diffs and user confirmation
 */
class IterativeCodeGenerator {
  constructor(language, agentName, projectRoot, apiToken = null) {
    this.language = language;
    this.agentName = agentName;
    this.projectRoot = projectRoot;
    this.apiToken = apiToken;
    this.generator = new CodeGenerator(language, agentName, projectRoot);
    this.appliedFunctions = [];
    this.skippedFunctions = [];
  }

  /**
   * Generate code iteratively for all selected functions
   */
  async generateIteratively(selectedFunctionIds, allNodes, apiToken = null) {
    console.log(chalk.blue.bold('\n🔄 Iterative Code Generation'));
    console.log(chalk.gray('We\'ll generate instrumented code for each function and ask for your approval.\n'));

    // Filter nodes to only selected functions
    const selectedNodes = allNodes.filter(node => selectedFunctionIds.includes(node.id));
    

    // Process each function iteratively
    for (let i = 0; i < selectedNodes.length; i++) {
      const node = selectedNodes[i];
      const isLast = i === selectedNodes.length - 1;
      
      console.log(chalk.cyan.bold(`📁 Function ${i + 1}/${selectedNodes.length}: ${node.name}`));
      console.log(chalk.gray(`${node.file}:${node.line}\n`));
      
      try {
        // Generate instrumented code for this function
        const result = await this.generateSingleFunction(node, selectedNodes, apiToken);
        
        if (result.applied) {
          this.appliedFunctions.push({ node, originalCode: result.originalCode, ...result });
          console.log(chalk.green.bold('✅ Applied instrumentation\n'));
        } else {
          this.skippedFunctions.push(node);
          console.log(chalk.yellow.bold('⏭️  Skipped function\n'));
        }
        
        // Ask if user wants to continue (except for last function)
        if (!isLast) {
          const { continueGeneration } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continueGeneration',
              message: 'Continue to next function?',
              default: true
            }
          ]);
          
          if (!continueGeneration) {
            console.log(chalk.yellow('\n🛑 Code generation stopped by user'));
            break;
          }
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Error generating code for ${node.name}: ${error.message}`));
        
        const { continueOnError } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueOnError',
            message: 'Continue with remaining functions?',
            default: true
          }
        ]);
        
        if (!continueOnError) break;
      }
    }

    // Show final summary
    this.showFinalSummary();
    
    return {
      appliedFunctions: this.appliedFunctions,
      skippedFunctions: this.skippedFunctions,
      generator: this
    };
  }

     /**
    * Generate and confirm instrumentation for a single function
    */
   async generateSingleFunction(node, allNodes, apiToken = null) {
     // Get original function code with loading
     const codeSpinner = ora(`Reading original code for ${node.name}...`).start();
     const originalCode = await this.generator.getOriginalFunctionCode(node);
     codeSpinner.succeed('Original code loaded');
     
     // Generate structured changes with loading
     const aiSpinner = ora(`Generating structured changes with AI...`).start();
     const { changes, originalArray, instrumentedArray } = await this.generator.generateInstrumentedFunction(node, originalCode, allNodes, apiToken);
     aiSpinner.succeed('AI structured changes completed');
     
     // Debug: Show the AI response
     console.log(chalk.bgBlack.cyan.bold('\n🤖 AI Response:'));
     
     if (changes.additions.length === 0) {
      console.log(chalk.bgBlack.red('No changes required'));
      return { applied: false };
     }

     // Show visual diff
     this.showStructuredDiff(node, originalArray, changes);
     
     // Ask for user confirmation
     const { action } = await inquirer.prompt([
       {
         type: 'list',
         name: 'action',
         message: `Do you want to make this edit to ${node.file.split('/').pop()}?`,
         choices: [
           { name: 'Yes', value: 'apply' },
           { name: 'No', value: 'skip' }
         ],
         default: 'apply'
       }
     ]);

     switch (action) {
       case 'apply':
         return {
           applied: true,
           originalCode,
           originalArray,
           structuredChanges: changes,
           filePath: path.resolve(node.file)
         };
       
       case 'skip':
         return { applied: false };
       
       default:
         return { applied: false };
     }
   }

   showStructuredDiff(node, originalCode, structuredChanges) {
    // Convert structured changes to the format expected by the new diff viewer
    const changes = structuredChanges.fullCode.map(item => ({
      type: item.type,
      content: item.content,
      modifiedContent: item.modifiedContent
    }));
    
    // Show the new styled diff viewer
    this.showStyledDiffViewer(node.file, changes);
  }

  /**
   * Show styled diff viewer with boxes like in the image
   */
  showStyledDiffViewer(filePath, changes) {
    // Outer box border
    const borderWidth = 80;
    const borderChar = '─';
    const cornerChars = { tl: '┌', tr: '┐', bl: '└', br: '┘', v: '│', h: borderChar };
    
    // File title (outside the outer box)
    console.log(chalk.white.bold(`\n${filePath}`));
    
    // Outer box top border
    console.log(chalk.gray(cornerChars.tl + cornerChars.h.repeat(borderWidth - 2) + cornerChars.tr));
    
    // Outer box content (empty space)
    console.log(chalk.gray(cornerChars.v + ' '.repeat(borderWidth - 2) + cornerChars.v));
    
    // Inner box title and border
    const innerTitle = `Editing ${filePath.split('/').pop()}`;
    const innerBorderWidth = Math.max(borderWidth - 4, innerTitle.length + 4);
    
    console.log(chalk.gray(cornerChars.v + ' ' + chalk.white.bold(innerTitle) + ' '.repeat(innerBorderWidth - innerTitle.length - 1) + chalk.gray(cornerChars.v)));
    console.log(chalk.gray(cornerChars.v + ' ' + cornerChars.tl + cornerChars.h.repeat(innerBorderWidth - 4) + cornerChars.tr + ' '.repeat(borderWidth - innerBorderWidth - 3) + cornerChars.v));
    
    // Inner box content with changes
    this.showChangesInInnerBox(changes, borderWidth, innerBorderWidth);
    
    // Inner box bottom border
    console.log(chalk.gray(cornerChars.v + ' ' + cornerChars.bl + cornerChars.h.repeat(innerBorderWidth - 4) + cornerChars.br + ' '.repeat(borderWidth - innerBorderWidth - 3) + cornerChars.v));
    
    // Outer box bottom content
    console.log(chalk.gray(cornerChars.v + ' '.repeat(borderWidth - 2) + cornerChars.v));
    console.log(chalk.gray(cornerChars.bl + cornerChars.h.repeat(borderWidth - 2) + cornerChars.br));
  }

  /**
   * Show changes inside the inner box with proper styling
   */
  showChangesInInnerBox(changes, outerWidth, innerWidth) {
    const additions = changes.filter(c => c.type === 'add');
    const removals = changes.filter(c => c.type === 'remove');
    const modifications = changes.filter(c => c.type === 'modify');
    
    // Show all changes with proper background colors
    [...additions, ...removals, ...modifications].forEach(change => {
      let lineContent = '';
      
      if (change.type === 'add') {
        lineContent = chalk.bgGreen.white(`+ ${change.content}`);
      } else if (change.type === 'remove') {
        lineContent = chalk.bgRed.white(`- ${change.content}`);
      } else if (change.type === 'modify') {
        // Show both old and new lines for modifications
        console.log(chalk.gray('│') + ' ' + chalk.bgRed.white(`- ${change.content}`) + ' '.repeat(Math.max(0, innerWidth - change.content.length - 4)) + ' '.repeat(outerWidth - innerWidth - 3) + chalk.gray('│'));
        lineContent = chalk.bgGreen.white(`+ ${change.modifiedContent}`);
      }
      
      // Pad the line content to fit within the inner box
      const paddedContent = lineContent + ' '.repeat(Math.max(0, innerWidth - lineContent.length - 4));
      console.log(chalk.gray('│') + ' ' + paddedContent + ' '.repeat(outerWidth - innerWidth - 3) + chalk.gray('│'));
    });
  }

      /**
   * Show simplified diff with summary and context only
   */
      showContextAroundChangesDark(originalLines, structuredChanges, node) {
        const contextLines = 4;
    
       const changes = structuredChanges.fullCode.filter(item => item.type === 'add' || item.type === 'remove');
        const fullCode = structuredChanges.fullCode;
       if (changes.filter(item => item.type === 'add' || item.type === 'remove').length === 0) return;
    
        console.log(chalk.bgBlack.yellow.bold('\n📋 Changes:'));
        console.log(chalk.bgBlack.white('─'.repeat(80)));
    
        let position = 1;
        let startOriginal = originalLines[0].lineNumber;
    
        changes.forEach((change, index) => {
          const lineNumber = change.lineNumber;
    
          if (lineNumber < startOriginal) {
            if (change.type === 'add') {
              console.log(
                chalk.bgGreen.black(
                  `${lineNumber.toString().padStart(3)}: + ${change.code}`
                )
              );  
            } else if (change.type === 'remove') {
              console.log(
                chalk.bgRed.white(
                  `${lineNumber.toString().padStart(3)}: - ${change.code}`
                )
              );
            }
            return;
          }
    
          // Show context before change (only if we haven't shown it yet)
          let contextStart = lineNumber - contextLines;
          const contextBeforeStart = Math.max(position + 1, contextStart, startOriginal);
          if (contextBeforeStart > position + 1) {
            console.log(chalk.bgBlack.white('...'));
          }
          position = lineNumber;
          if (contextBeforeStart < lineNumber) {
            for (let i = contextBeforeStart; i < lineNumber; i++) {
              const lineContent = fullCode.find(item => item.lineNumber == i)?.code || '';
              console.log(
                chalk.bgBlack.white(
                  `${(i).toString().padStart(3)}: ${lineContent}`
                )
              );
            }
          }
    
          // Show the change
          if (change.type === 'add') {
            console.log(
              chalk.bgGreen.black(
                `${lineNumber.toString().padStart(3)}: + ${change.code}`
              )
            );
          } else if (change.type === 'remove') {
            console.log(
              chalk.bgRed.white(
                `${lineNumber.toString().padStart(3)}: - ${change.code}`
              )
            );
          }

    
          // Show context after change (only for the last change on this line)
          const nextChange = changes[index + 1];
          const isLastChangeOnThisLine = !nextChange || nextChange.line > (lineNumber + 1);
    
          if (isLastChangeOnThisLine) {
            const contextAfterStart = lineNumber + 1;
            let contextAfterEnd = lineNumber + contextLines - 1;
            if (nextChange) {
              contextAfterEnd = Math.min(
                contextAfterEnd,
                nextChange.line - 1
              );
            }
    
            if (contextAfterStart < contextAfterEnd) {
              for (let i = contextAfterStart; i <= contextAfterEnd; i++) {
                const lineContent = fullCode.find(item => item.lineNumber == i)?.code || '';
                console.log(
                  chalk.bgBlack.white(
                    `${(i).toString().padStart(3)}: ${lineContent}`
                  )
                );
              }
              position = contextAfterEnd;
            } else {
              position = lineNumber;
            }
          } else {
            // Don't show context yet, wait for the last change on this line
            position = lineNumber;
          }
        });
    
        console.log(chalk.bgBlack.white('─'.repeat(80)));
      }
    
      /**
       * Create unified changes by properly mapping AI line numbers to file line numbers
       */
      createUnifiedChanges(originalLines, structuredChanges) {
        const changes = [];
    
        // Process additions
        structuredChanges.additions.forEach((addition) => {
          changes.push({
            type: 'addition',
            line: addition.line,
            content: addition.content,
          });
        });
    
        // Process removals
        structuredChanges.removals.forEach((removal) => {
          changes.push({
            type: 'removal',
            line: removal.line,
            content: removal.content,
          });
        });
    
        // Sort by line number, then by type (removals before additions for same line)
        return changes.sort((a, b) => {
          if (a.line !== b.line) {
            return a.line - b.line;
          }
          // For same line, show removals before additions
          return a.type === 'removal' ? -1 : 1;
        });
      }
    

   /**
    * Map AI line numbers to actual file line numbers
    */
   mapLineNumberToFile(aiLineNumber, originalLines) {
     // The AI is likely using absolute file line numbers (like 64, 80)
     // but we need to map them to the function's relative line numbers (1-based)
     
     // If the line number is within the function's range, use it as is
     if (aiLineNumber <= originalLines.length) {
       return aiLineNumber;
     }
     
     // If it's an absolute file line number, we need to estimate the mapping
     // Based on the AI response, it seems like it's using line numbers like 64, 80
     // Let's assume the function starts around line 64 and map accordingly
     
     // Calculate the offset from the assumed function start
     const assumedFunctionStart = 64; // This is a guess based on the AI output
     const relativeLine = aiLineNumber - assumedFunctionStart + 1;
     
     // Ensure it's within bounds
     if (relativeLine >= 1 && relativeLine <= originalLines.length) {
       return relativeLine;
     }
     
     // Fallback: just use the line number as is, but cap it
     return Math.min(aiLineNumber, originalLines.length);
   }

   /**
    * Show context around changes with 4 lines above and below
    */
   showContextAroundChanges(originalLines, structuredChanges) {
     const contextLines = 4;
     const allChanges = [
       ...structuredChanges.additions.map(a => ({ type: 'addition', line: a.line })),
       ...structuredChanges.removals.map(r => ({ type: 'removal', line: r.line })),
     ];
     
     if (allChanges.length === 0) return;
     
     // Sort changes by line number
     allChanges.sort((a, b) => a.line - b.line);
     
     console.log(chalk.yellow.bold('\n📋 Context Around Changes:'));
     console.log(chalk.gray('─'.repeat(80)));
     
     let lastContextEnd = -1;
     
     allChanges.forEach((change, index) => {
       const lineNumber = change.line;
       const contextStart = Math.max(0, lineNumber - contextLines - 1);
       const contextEnd = Math.min(originalLines.length - 1, lineNumber + contextLines - 1);
       
       // Add separator if there's a gap
       if (lastContextEnd >= 0 && contextStart > lastContextEnd + 1) {
         console.log(chalk.gray('   ...'));
       }
       
       // Show context before change
       const contextBeforeStart = Math.max(lastContextEnd + 1, contextStart);
       if (contextBeforeStart < lineNumber) {
         for (let i = contextBeforeStart; i < lineNumber; i++) {
           const lineContent = originalLines[i] || '';
           console.log(chalk.gray(`${(i + 1).toString().padStart(3)}: ${lineContent}`));
         }
       }
       
       // Show the change
       if (change.type === 'addition') {
         const addition = structuredChanges.additions.find(a => a.line === lineNumber);
         console.log(chalk.bgGreen.black(`${lineNumber.toString().padStart(3)}: + ${addition.content}`));
       } else if (change.type === 'removal') {
         const removal = structuredChanges.removals.find(r => r.line === lineNumber);
         console.log(chalk.bgRed.white(`${lineNumber.toString().padStart(3)}: - ${removal.content}`));
       }
       
       // Show context after change
       const contextAfterStart = lineNumber;
       const contextAfterEnd = Math.min(originalLines.length, contextEnd + 1);
       if (contextAfterStart < contextAfterEnd) {
         for (let i = contextAfterStart; i < contextAfterEnd; i++) {
           const lineContent = originalLines[i] || '';
           console.log(chalk.gray(`${(i + 1).toString().padStart(3)}: ${lineContent}`));
         }
         lastContextEnd = contextAfterEnd - 1;
       } else {
         lastContextEnd = lineNumber - 1;
       }
     });
     
     console.log(chalk.gray('─'.repeat(80)));
   }

  

     /**
    * Show a proper line-by-line diff with context
    */
   showDiffPreview(originalLines, instrumentedLines) {
     const diff = this.createLineByLineDiff(originalLines, instrumentedLines);
     const contextLines = 4;
     
     console.log(chalk.yellow('📝 Code Changes:'));
     console.log(chalk.gray('─'.repeat(80)));
     
     diff.forEach((block, index) => {
       if (block.type === 'context') {
         // Show context lines in gray
         block.lines.forEach((line, lineIndex) => {
           const lineNumber = block.startLineNumber + lineIndex;
           console.log(chalk.gray(`${lineNumber.toString().padStart(3)}: ${line}`));
         });
       } else if (block.type === 'addition') {
         // Show added lines with green background
         block.lines.forEach((line, lineIndex) => {
           const lineNumber = block.startLineNumber + lineIndex;
           console.log(chalk.bgGreen.black(`${lineNumber.toString().padStart(3)}: + ${line}`));
         });
       } else if (block.type === 'removal') {
         // Show removed lines with red background
         block.lines.forEach((line, lineIndex) => {
           const lineNumber = block.startLineNumber + lineIndex;
           console.log(chalk.bgRed.white(`${lineNumber.toString().padStart(3)}: - ${line}`));
         });
       } else if (block.type === 'change') {
         // Show original line being changed
         if (block.originalLines && block.originalLines.length > 0) {
           block.originalLines.forEach((line, lineIndex) => {
             const lineNumber = block.originalStartLineNumber + lineIndex;
             console.log(chalk.bgRed.white(`${lineNumber.toString().padStart(3)}: - ${line}`));
           });
         }
         // Show new line
         block.lines.forEach((line, lineIndex) => {
           const lineNumber = block.startLineNumber + lineIndex;
           console.log(chalk.bgGreen.black(`${lineNumber.toString().padStart(3)}: + ${line}`));
         });
       }
       
       // Add separator between blocks (except for the last one)
       if (index < diff.length - 1 && diff[index + 1].type !== 'context') {
         console.log(chalk.gray('   ...'));
       }
     });
     
     console.log(chalk.gray('─'.repeat(80)));
     console.log('');
   }

   /**
    * Create a proper line-by-line diff with context
    */
   createLineByLineDiff(originalLines, instrumentedLines) {
     const contextLines = 4;
     const diff = [];
     
     // Use a simple but effective diff algorithm
     const changes = this.findLineByLineChanges(originalLines, instrumentedLines);
     
     if (changes.length === 0) {
       return diff;
     }
     
     // Group changes and add context
     let lastContextEnd = -1;
     
     changes.forEach((change, index) => {
       const startLine = change.originalLine;
       const contextStart = Math.max(0, startLine - contextLines);
       const contextEnd = Math.min(originalLines.length - 1, startLine + contextLines);
       
       // Add separator if there's a gap from last context
       if (lastContextEnd >= 0 && contextStart > lastContextEnd + 1) {
         diff.push({ type: 'separator' });
       }
       
       // Add context before change (if not overlapping with previous)
       const contextBeforeStart = Math.max(lastContextEnd + 1, contextStart);
       if (contextBeforeStart < startLine) {
         diff.push({
           type: 'context',
           lines: originalLines.slice(contextBeforeStart, startLine),
           startLineNumber: contextBeforeStart + 1
         });
       }
       
       // Add the change
       diff.push({
         type: change.type,
         lines: change.lines,
         originalLines: change.originalLines,
         startLineNumber: startLine + 1,
         originalStartLineNumber: startLine + 1
       });
       
       // Add context after change
       const contextAfterStart = startLine + 1;
       const contextAfterEnd = Math.min(originalLines.length, contextEnd + 1);
       if (contextAfterStart < contextAfterEnd) {
         diff.push({
           type: 'context',
           lines: originalLines.slice(contextAfterStart, contextAfterEnd),
           startLineNumber: contextAfterStart + 1
         });
         lastContextEnd = contextAfterEnd - 1;
       } else {
         lastContextEnd = startLine;
       }
     });
     
     return diff;
   }

   /**
    * Find line-by-line changes by comparing original vs generated code
    */
   findLineByLineChanges(originalLines, instrumentedLines) {
     const changes = [];
     
     // First, find the matching portion in the original code
     const matchingPortion = this.findMatchingPortion(originalLines, instrumentedLines);
     
     if (!matchingPortion) {
       // If no matching portion found, treat everything as addition
       changes.push({
         type: 'addition',
         originalLine: 0,
         lines: instrumentedLines,
         originalLines: []
       });
       return changes;
     }
     
     // Now do line-by-line comparison within the matching portion
     const { startIndex, endIndex, matchPosition } = matchingPortion;
     const originalPortion = originalLines.slice(startIndex, endIndex + 1);
     const instrumentedPortion = instrumentedLines.slice(matchPosition, matchPosition + originalPortion.length);
     
     // Use a simple diff algorithm to find changes
     let origIndex = 0;
     let instIndex = 0;
     
     while (origIndex < originalPortion.length || instIndex < instrumentedPortion.length) {
       const originalLine = origIndex < originalPortion.length ? originalPortion[origIndex] : null;
       const instrumentedLine = instIndex < instrumentedPortion.length ? instrumentedPortion[instIndex] : null;
       
       if (originalLine === instrumentedLine) {
         // Lines match, move both pointers
         origIndex++;
         instIndex++;
       } else if (originalLine && !instrumentedLine) {
         // Line was removed
         changes.push({
           type: 'removal',
           originalLine: startIndex + origIndex,
           lines: [],
           originalLines: [originalLine]
         });
         origIndex++;
       } else if (!originalLine && instrumentedLine) {
         // Line was added
         changes.push({
           type: 'addition',
           originalLine: startIndex + origIndex,
           lines: [instrumentedLine],
           originalLines: []
         });
         instIndex++;
       } else if (originalLine && instrumentedLine) {
         // Lines are different (modified)
         changes.push({
           type: 'change',
           originalLine: startIndex + origIndex,
           lines: [instrumentedLine],
           originalLines: [originalLine]
         });
         origIndex++;
         instIndex++;
       } else {
         // Both are null, we're done
         break;
       }
     }
     
     return changes;
   }

   /**
    * Find the matching portion of the original code that corresponds to the instrumented code
    */
   findMatchingPortion(originalLines, instrumentedLines) {
     // Look for the longest matching sequence
     let bestMatch = null;
     let bestLength = 0;
     
     // Try different starting points in the original code
     for (let start = 0; start < originalLines.length; start++) {
       // Try different lengths
       for (let length = 5; length <= Math.min(20, originalLines.length - start); length++) {
         const originalPortion = originalLines.slice(start, start + length);
         
         // Check if this portion appears in the instrumented code
         const matchPosition = this.findPortionInInstrumented(originalPortion, instrumentedLines);
         
         if (matchPosition !== -1 && length > bestLength) {
           bestMatch = { 
             startIndex: start, 
             endIndex: start + length - 1,
             matchPosition: matchPosition
           };
           bestLength = length;
         }
       }
     }
     
     return bestMatch;
   }

   /**
    * Find the position of a portion in the instrumented code
    */
   findPortionInInstrumented(originalPortion, instrumentedLines) {
     // Look for the sequence in instrumented lines
     for (let i = 0; i <= instrumentedLines.length - originalPortion.length; i++) {
       let match = true;
       
       for (let j = 0; j < originalPortion.length; j++) {
         if (instrumentedLines[i + j] !== originalPortion[j]) {
           match = false;
           break;
         }
       }
       
       if (match) {
         return i;
       }
     }
     
     return -1;
   }





   



   /**
    * Check if a line is a Handit addition
    */
   isHanditAddition(line) {
     return line && (
       line.includes('require(') && line.includes('handit_service') ||
       line.includes('startTracing') ||
       line.includes('trackNode') ||
       line.includes('endTracing') ||
       line.includes('let executionId') ||
       line.includes('const tracingResponse') ||
       line.includes('} finally {') && line.trim() === '} finally {' ||
       line.includes('try {') && this.isTracingTryBlock(line)
     );
   }

   /**
    * Check if this is a try block added for tracing
    */
   isTracingTryBlock(line) {
     // This is a simple heuristic - could be improved
     return line.trim() === 'try {';
   }

   /**
    * Check if a line has been modified (e.g., function call with executionId added)
    */
   isModifiedLine(originalLine, instrumentedLine) {
     // Check if executionId was added to a function call
     if (originalLine && instrumentedLine) {
       const originalTrimmed = originalLine.trim();
       const instrumentedTrimmed = instrumentedLine.trim();
       
       // Look for function calls that had executionId added
       if (originalTrimmed.includes('(') && instrumentedTrimmed.includes('executionId') &&
           !originalTrimmed.includes('executionId')) {
         return true;
       }
     }
     
     return false;
   }

   /**
    * Get context lines before a change
    */
   getContextBefore(originalLines, startIndex, contextLines) {
     const start = Math.max(0, startIndex - contextLines);
     const end = startIndex;
     return originalLines.slice(start, end);
   }

   /**
    * Get context lines after a change
    */
   getContextAfter(originalLines, endIndex, contextLines) {
     const start = endIndex + 1;
     const end = Math.min(originalLines.length, start + contextLines);
     return originalLines.slice(start, end);
   }

   /**
    * Find matching context in original lines
    */
   findMatchingContext(originalLines, contextLines) {
     if (contextLines.length === 0) return -1;
     
     for (let i = 0; i <= originalLines.length - contextLines.length; i++) {
       let matches = 0;
       for (let j = 0; j < contextLines.length; j++) {
         if (originalLines[i + j] && contextLines[j] && 
             originalLines[i + j].trim() === contextLines[j].trim()) {
           matches++;
         }
       }
       if (matches >= Math.ceil(contextLines.length * 0.7)) { // 70% match threshold
         return i;
       }
     }
     
     return -1;
   }

  /**
   * Create simple diff analysis
   */
  createSimpleDiff(originalLines, instrumentedLines) {
    const changes = [];
    let additions = 0;
    let removals = 0;
    
    // Count additions by looking for instrumentation patterns
    instrumentedLines.forEach(line => {
      if (line.includes('require(') && line.includes('handit_service')) {
        changes.push('✓ Added Handit service import');
        additions++;
      } else if (line.includes('startTracing')) {
        changes.push('✓ Added tracing initialization');
        additions++;
      } else if (line.includes('trackNode')) {
        changes.push('✓ Added execution tracking');
        additions++;
      } else if (line.includes('endTracing')) {
        changes.push('✓ Added tracing cleanup');
        additions++;
      } else if (line.includes('executionId') && !originalLines.some(orig => orig.includes('executionId'))) {
        additions++;
      }
    });
    
    // Basic change detection
    if (instrumentedLines.length > originalLines.length) {
      const newLines = instrumentedLines.length - originalLines.length;
      if (additions === 0) additions = newLines;
    }
    
    if (changes.length === 0) {
      changes.push('✓ Added Handit.ai instrumentation');
    }
    
    return { additions, removals, changes };
  }

  /**
   * Show final summary of applied changes
   */
  showFinalSummary() {
    console.log(chalk.blue.bold('\n📋 Code Generation Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(chalk.green(`✅ Applied: ${this.appliedFunctions.length} functions`));
    this.appliedFunctions.forEach(func => {
      console.log(chalk.green(`   ✓ ${func.node.name} (${func.node.file}:${func.node.line})`));
    });
    
    if (this.skippedFunctions.length > 0) {
      console.log(chalk.yellow(`⏭️  Skipped: ${this.skippedFunctions.length} functions`));
      this.skippedFunctions.forEach(node => {
        console.log(chalk.yellow(`   - ${node.name} (${node.file}:${node.line})`));
      });
    }
    
    console.log(chalk.gray('─'.repeat(50)));
    
    if (this.appliedFunctions.length > 0) {
      console.log(chalk.yellow.bold('\n📋 Next Steps:'));
      if (this.language === 'javascript') {
        console.log(chalk.gray('1. Install Handit.ai SDK: npm i @handit.ai/handit-ai'));
      } else {
        console.log(chalk.gray('1. Install Handit.ai SDK: pip install handit_ai'));
      }
      console.log(chalk.gray('2. Set your API key: export HANDIT_API_KEY="your-key"'));
      console.log(chalk.gray('3. Replace the original functions with instrumented versions'));
      console.log(chalk.gray('4. Test your agent to start collecting traces'));
    }
  }

  /**
   * Apply structured changes to the file
   */
  async applyStructuredChangesToFile(node, structuredChanges, originalCode, justAdd = false) {
    try {
      const filePath = path.resolve(node.file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      let lines = fileContent.split('\n');
      let newLines = [];

      if (justAdd) {
        for (let i = 0; i < structuredChanges.length; i++) {
          newLines.push(structuredChanges[i].code);
        }
        newLines.push('\n');
        newLines = [...newLines, ...lines];
        await fs.writeFile(filePath, newLines.join('\n'));
        console.log(chalk.green(`✓ Applied structured changes to ${node.file}`));
        return;
      }
            
      
      for (let i = 0; i < node.line - 1; i++) {
        newLines.push(lines[i]);
      }

      const fullChanges = structuredChanges.fullCode.filter(item =>  item.lineNumber >= node.line);

      for (let i = 0; i < fullChanges.length; i++) {
        if (fullChanges[i].type === 'add' || fullChanges[i].type === 'keep') {
          newLines.push(fullChanges[i].code);
        }
      }

      for (let i = node.line + originalCode.length - 1; i < lines.length; i++) {
        newLines.push(lines[i]);
      }

      

      await fs.writeFile(filePath, newLines.join('\n'));
      console.log(chalk.green(`✓ Applied structured changes to ${node.file}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error applying changes to ${node.file}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Group changes by file path
   */
  groupChangesByFile() {
    const changesByFile = {};
    
    for (const func of this.appliedFunctions) {
      const filePath = path.resolve(func.node.file);
      
      if (!changesByFile[filePath]) {
        changesByFile[filePath] = [];
      }
      
      changesByFile[filePath].push(func);
    }
    
    return changesByFile;
  }

  /**
   * Apply all changes to a single file at once
   */
  async applyAllChangesToSingleFile(filePath, fileChanges) {
    try {
      // Sort functions by their starting line number (descending)
      // Apply from bottom to top to avoid line number shifts
      fileChanges.sort((a, b) => b.node.line - a.node.line);
      const node = fileChanges[0].node;
      let topChanges = [];
      if (node) {
        topChanges = fileChanges[0].structuredChanges.fullCode.filter(item => item.lineNumber < node.line && (item.type === 'add' || item.type === 'keep') );
      }
      console.log(chalk.gray(`  └── Applying ${fileChanges.length} function changes (bottom to top)...`));
      
      // Apply each function's changes from bottom to top
      // This way, line numbers stay consistent for subsequent changes
      for (let i = 0; i < fileChanges.length; i++) {
        const func = fileChanges[i];
        console.log(chalk.gray(`      ${i + 1}/${fileChanges.length}: ${func.node.name} (line ${func.node.line})`));
        
        try {
          await this.applyStructuredChangesToFile(func.node, func.structuredChanges, func.originalArray);
        } catch (error) {
          console.error(chalk.red(`Failed to apply changes for ${func.node.name}: ${error.message}`));
          // Continue with other functions rather than failing completely
        }
      }

      if (topChanges.length > 0) {
        await this.applyStructuredChangesToFile(node, topChanges, fileChanges[0].originalArray, true);
      }
      
      console.log(chalk.gray(`      ✓ Completed all changes for ${path.basename(filePath)}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error applying changes to ${filePath}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Apply all pending changes to files
   */
  async applyAllPendingChanges() {
    if (this.appliedFunctions.length === 0) {
      console.log(chalk.yellow('No changes to apply.'));
      return;
    }

    console.log(chalk.blue.bold('\n📝 Applying all accepted changes...'));
    
    // Group changes by file path
    const changesByFile = this.groupChangesByFile();
    
    // Apply changes file by file
    for (const [filePath, fileChanges] of Object.entries(changesByFile)) {
      try {
        console.log(chalk.blue(`📄 Processing ${fileChanges.length} functions in ${path.basename(filePath)}...`));
        await this.applyAllChangesToSingleFile(filePath, fileChanges);
        console.log(chalk.green(`✓ Applied all changes to ${path.basename(filePath)}`));
      } catch (error) {
        console.error(chalk.red(`❌ Failed to apply changes to ${filePath}: ${error.message}`));
      }
    }
    
    console.log(chalk.green('✅ All changes applied successfully!'));
  }

  /**
   * No longer needed - configuration is inlined in the entry point file
   */
  async createHanditServiceFile(apiToken) {
    console.log(chalk.gray('Using simplified approach - configuration will be added directly to the entry point file'));
  }
}

module.exports = { IterativeCodeGenerator }; 