/**
 * Ink-based function selection component
 * Replaces the inquirer list with beautiful Ink UI
 */

/**
 * Show function selection with Ink UI
 */
async function showInkFunctionSelection(functions) {
  try {
    // Dynamic import of Ink components
    const { Box, Text, render, useInput } = await import('ink');
    const React = await import('react');
    
    return new Promise((resolve, reject) => {
      const [selectedIndex, setSelectedIndex] = React.useState(0);
      
      // Function selection component
      function FunctionSelection({ functions, onSelect, onCancel }) {
        useInput((input, key) => {
          if (key.upArrow) {
            setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : functions.length - 1);
          } else if (key.downArrow) {
            setSelectedIndex(selectedIndex < functions.length - 1 ? selectedIndex + 1 : 0);
          } else if (key.return) {
            onSelect(functions[selectedIndex]);
          } else if (key.ctrl && input === 'c') {
            onCancel();
          }
        });

        const getTypeIcon = (type) => {
          switch (type) {
            case 'endpoint': return '🌐';
            case 'method': return '🔧';
            case 'handler': return '📡';
            default: return '⚙️';
          }
        };

        const getConfidenceColor = (confidence) => {
          if (confidence >= 0.9) return 'green';
          if (confidence >= 0.7) return 'yellow';
          if (confidence >= 0.5) return 'blue';
          return 'gray';
        };

        const formatFunctionPreview = (func) => {
          const maxLength = 60;
          if (func.preview.length <= maxLength) {
            return func.preview;
          }
          return func.preview.substring(0, maxLength - 3) + '...';
        };

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Header
          React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
            React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '🎯 Function Selection'),
            React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Which function or endpoint is your agent\'s entry point?'),
          ]),
          
          // Functions list
          React.createElement(Box, { key: 'functions', flexDirection: 'column', marginBottom: 2 }, [
            functions.map((func, index) => {
              const isSelected = index === selectedIndex;
              const typeIcon = getTypeIcon(func.type);
              const confidenceColor = getConfidenceColor(func.confidence);
              const preview = formatFunctionPreview(func);
              
              return React.createElement(Box, { key: `func-${index}`, marginBottom: 1 }, [
                React.createElement(Box, { key: `func-content-${index}`, flexDirection: 'row' }, [
                  React.createElement(Text, {
                    key: `selector-${index}`,
                    color: isSelected ? 'cyan' : 'gray',
                    backgroundColor: isSelected ? 'blue' : 'black',
                    bold: isSelected
                  }, isSelected ? '► ' : '  '),
                  
                  React.createElement(Text, { key: `icon-${index}`, marginRight: 1 }, typeIcon),
                  
                  React.createElement(Box, { key: `content-${index}`, flexDirection: 'column', flexGrow: 1 }, [
                    React.createElement(Box, { key: `name-line-${index}`, flexDirection: 'row' }, [
                      React.createElement(Text, { 
                        key: `name-${index}`,
                        color: isSelected ? 'white' : 'white',
                        bold: isSelected
                      }, `${func.name} (line ${func.line})`),
                      React.createElement(Text, { key: `dash-${index}`, color: 'gray' }, ' - '),
                      React.createElement(Text, { 
                        key: `confidence-${index}`,
                        color: confidenceColor,
                        bold: true
                      }, `${Math.round(func.confidence * 100)}%`)
                    ]),
                    React.createElement(Text, { 
                      key: `preview-${index}`,
                      color: isSelected ? 'white' : 'gray',
                      dimColor: !isSelected
                    }, preview)
                  ])
                ])
              ]);
            })
          ]),
          
          // Instructions
          React.createElement(Box, { key: 'instructions' }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 'Use ↑ ↓ arrows to navigate, Enter to select'),
          ])
        ]);
      }

      const { unmount } = render(
        React.createElement(FunctionSelection, {
          functions: functions,
          onSelect: (selectedFunction) => {
            unmount();
            resolve(selectedFunction);
          },
          onCancel: () => {
            unmount();
            reject(new Error('Function selection cancelled'));
          }
        })
      );
    });
  } catch (error) {
    console.error('Error loading Ink for function selection:', error.message);
    // Fallback to original inquirer
    const inquirer = require('inquirer');
    const chalk = require('chalk');
    
    const { functionChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'functionChoice',
        message: 'Which function or endpoint is your agent\'s entry point?',
        choices: functions.map((func, index) => {
          const typeIcon = func.type === 'endpoint' ? '🌐' : 
                          func.type === 'method' ? '🔧' : 
                          func.type === 'handler' ? '📡' : '⚙️';
          
          const confidenceColor = func.confidence >= 0.9 ? chalk.green : 
                                 func.confidence >= 0.7 ? chalk.yellow : 
                                 func.confidence >= 0.5 ? chalk.blue : chalk.gray;
          
          return {
            name: `${typeIcon} ${func.name} (line ${func.line}) - ${confidenceColor(`${Math.round(func.confidence * 100)}%`)}`,
            value: func
          };
        })
      }
    ]);
    
    return functionChoice;
  }
}

module.exports = { showInkFunctionSelection };
