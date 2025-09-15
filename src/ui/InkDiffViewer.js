/**
 * Ink-based diff viewer using dynamic imports for ES module compatibility
 */

/**
 * Show a beautiful diff viewer using Ink
 */
async function showInkDiffViewer(filePath, changes) {
  try {
    // Dynamic import of Ink components
    const { Box, Text, render, useInput } = await import('ink');
    const React = await import('react');
    
    // Create the component function
    // eslint-disable-next-line no-inner-declarations
    function DiffViewerComponent({ filePath, changes, onConfirm, onReject }) {
      const [selectedOption, setSelectedOption] = React.useState(0); // 0 = Yes, 1 = No

      useInput((input, key) => {
        if (input === 'y' || input === 'Y') {
          onConfirm();
        } else if (input === 'n' || input === 'N') {
          onReject();
        } else if (key.leftArrow) {
          setSelectedOption(0);
        } else if (key.rightArrow) {
          setSelectedOption(1);
        } else if (key.return) {
          if (selectedOption === 0) {
            onConfirm();
          } else {
            onReject();
          }
        } else if (key.ctrl && input === 'c') {
          onReject();
        }
      });

      const fileName = filePath.split('/').pop();
      const maxWidth = 60;

      const wrapText = (text, maxWidth) => {
        if (!text || text.length <= maxWidth) {
          return [text || ''];
        }
        
        const lines = [];
        let currentLine = '';
        const words = text.split(' ');
        
        for (const word of words) {
          if ((currentLine + ' ' + word).length > maxWidth && currentLine.length > 0) {
            lines.push(currentLine.trim());
            currentLine = word;
          } else {
            currentLine += (currentLine.length > 0 ? ' ' : '') + word;
          }
        }
        
        if (currentLine.length > 0) {
          lines.push(currentLine.trim());
        }
        
        return lines;
      };

      const renderChanges = () => {
        const changeElements = [];
        
        changes.forEach((change, index) => {
          const content = change.content || change.modifiedContent || '';
          const wrapped = wrapText(content, maxWidth);
          
          wrapped.forEach((line, lineIndex) => {
            const isFirstLine = lineIndex === 0;
            const lineNum = isFirstLine ? (index + 1).toString().padStart(3) : '   ';
            const symbol = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~';
            
            let bgColor = 'black';
            let textColor = 'white';
            
            if (change.type === 'add') {
              bgColor = 'green';
            } else if (change.type === 'remove') {
              bgColor = 'red';
            } else if (change.type === 'modify') {
              bgColor = isFirstLine ? 'red' : 'green';
            }

            changeElements.push(
              React.createElement(Box, { key: `${index}-${lineIndex}`, flexDirection: 'row' }, [
                React.createElement(Text, { color: 'gray', width: 5 }, `${lineNum}:`),
                React.createElement(Text, { backgroundColor: bgColor, color: textColor, marginLeft: 1 }, `${symbol} ${line}`)
              ])
            );
          });

          // For modifications, also show the new content
          if (change.type === 'modify') {
            const newWrapped = wrapText(change.modifiedContent, maxWidth);
            newWrapped.forEach((line, lineIndex) => {
              const isFirstLine = lineIndex === 0;
              const lineNum = isFirstLine ? (index + 1).toString().padStart(3) : '   ';
              
              changeElements.push(
                React.createElement(Box, { key: `modify-${index}-${lineIndex}`, flexDirection: 'row' }, [
                  React.createElement(Text, { color: 'gray', width: 5 }, `${lineNum}:`),
                  React.createElement(Text, { backgroundColor: 'green', color: 'white', marginLeft: 1 }, `+ ${line}`)
                ])
              );
            });
          }
        });
        
        return changeElements;
      };

      return React.createElement(Box, { flexDirection: 'column', margin: 1 }, [
        // File title
        React.createElement(Box, { key: 'title' }, 
          React.createElement(Text, { bold: true, color: 'cyan' }, filePath)
        ),
        
        // Outer box
        React.createElement(Box, { key: 'outer-box', borderStyle: 'double', borderColor: 'white', padding: 1, marginTop: 1 }, [
          // Inner box with title
          React.createElement(Box, { key: 'inner-box', flexDirection: 'column' }, [
            React.createElement(Box, { key: 'inner-title', borderStyle: 'single', borderColor: 'yellow', padding: 1 },
              React.createElement(Text, { bold: true, color: 'yellow' }, `📝 Editing ${fileName}`)
            ),
            
            // Changes content
            React.createElement(Box, { key: 'changes', flexDirection: 'column', marginTop: 1 },
              renderChanges()
            )
          ])
        ]),
        
        // Confirmation prompt with selection
        React.createElement(Box, { key: 'prompt', marginTop: 2, flexDirection: 'column' }, [
          React.createElement(Text, { key: 'question', color: 'yellow' }, '❓ Do you want to make this edit to the file?'),
          React.createElement(Box, { key: 'options', marginTop: 1, flexDirection: 'row' }, [
            React.createElement(Box, { key: 'yes-option', marginRight: 2 },
              React.createElement(Text, {
                color: selectedOption === 0 ? 'green' : 'gray',
                bold: selectedOption === 0,
                backgroundColor: selectedOption === 0 ? 'green' : 'black',
                paddingX: 1
              }, '✓ Yes')
            ),
            React.createElement(Box, { key: 'no-option' },
              React.createElement(Text, {
                color: selectedOption === 1 ? 'red' : 'gray',
                bold: selectedOption === 1,
                backgroundColor: selectedOption === 1 ? 'red' : 'black',
                paddingX: 1
              }, '✗ No')
            )
          ]),
          React.createElement(Box, { key: 'help', marginTop: 1 },
            React.createElement(Text, { color: 'gray', dimColor: true }, 'Use ← → arrows to navigate, Y/N keys, or Enter to confirm')
          )
        ])
      ]);
    }

    return new Promise((resolve) => {
      const { unmount } = render(
        React.createElement(DiffViewerComponent, {
          filePath: filePath,
          changes: changes,
          onConfirm: () => {
            unmount();
            resolve(true);
          },
          onReject: () => {
            unmount();
            resolve(false);
          }
        }),
        {
          exitOnCtrlC: false,
          patchConsole: false, // Don't patch console to avoid clearing
          stdout: process.stdout,
          stdin: process.stdin
        }
      );
    });
  } catch (error) {
    console.error('Error loading Ink:', error.message);
    console.log('Falling back to simple text-based diff viewer...');
    
    // Fallback to simple text-based viewer
    return await showSimpleTextDiffViewer(filePath, changes);
  }
}

/**
 * Simple text-based fallback diff viewer
 */
async function showSimpleTextDiffViewer(filePath, changes) {
  const chalk = require('chalk');
  const inquirer = require('inquirer');
  
  console.log(chalk.white.bold(`\n${filePath}`));
  console.log(chalk.gray('─'.repeat(60)));
  
  changes.forEach((change, index) => {
    const lineNum = (index + 1).toString().padStart(3);
    const symbol = change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~';
    
    if (change.type === 'add') {
      console.log(chalk.green(`${symbol} ${lineNum}: ${change.content}`));
    } else if (change.type === 'remove') {
      console.log(chalk.red(`${symbol} ${lineNum}: ${change.content}`));
    } else if (change.type === 'modify') {
      console.log(chalk.red(`- ${lineNum}: ${change.content}`));
      console.log(chalk.green(`+ ${lineNum}: ${change.modifiedContent}`));
    }
  });
  
  console.log(chalk.gray('─'.repeat(60)));
  
  const { shouldApply } = await inquirer.prompt([
    {
      type: 'list',
      name: 'shouldApply',
      message: 'Do you want to make this edit to the file?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false }
      ],
      default: true
    }
  ]);
  
  return shouldApply;
}

module.exports = { showInkDiffViewer };