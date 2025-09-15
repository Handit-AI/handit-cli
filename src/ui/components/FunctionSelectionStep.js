/**
 * Function Selection Step Component
 */
function FunctionSelectionStep(React, Box, Text, { functions, selectedIndex, onSelect, selectedFile }) {
  return React.createElement(Box, { key: 'step6-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'cyan', bold: true }, `🔍 Function Detection in ${selectedFile?.file || 'selected file'}`),
    React.createElement(Box, { key: 'step-progress', marginTop: 2, flexDirection: 'column' }, [
      React.createElement(Text, { key: 'step-status', color: 'yellow' }, '🔍 Analyzing functions in file...'),
      React.createElement(Box, { key: 'step-bar', marginTop: 1, width: 40 }, [
        React.createElement(Text, { key: 'step-bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor(100 / 2.5))),
        React.createElement(Text, { key: 'step-bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor(100 / 2.5))),
      ]),
    ]),
    React.createElement(Text, { key: 'step-description', color: 'yellow', marginTop: 2 }, 'Please select the correct function:'),
    React.createElement(Box, { key: 'step-options', marginTop: 2, flexDirection: 'column' },
      functions.map((func, index) => 
        React.createElement(Box, { key: `func-option-${index}`, flexDirection: 'column', marginBottom: 1 }, [
          React.createElement(Box, { key: `func-header-${index}`, flexDirection: 'row' }, [
            React.createElement(Text, { 
              key: `func-indicator-${index}`, 
              color: selectedIndex === index ? 'green' : 'gray',
              marginRight: 1 
            }, selectedIndex === index ? '❯' : ' '),
            React.createElement(Text, { 
              key: `func-type-${index}`, 
              color: 'white' 
            }, func.type === 'endpoint' ? '🌐' : func.type === 'method' ? '🔧' : func.type === 'handler' ? '📡' : '⚙️'),
            React.createElement(Text, { 
              key: `func-name-${index}`, 
              color: selectedIndex === index ? 'white' : 'gray',
              bold: selectedIndex === index
            }, ` ${func.name} (line ${func.line})`),
          ]),
          React.createElement(Text, { 
            key: `func-code-${index}`, 
            color: 'gray',
            marginLeft: 2
          }, `  - ${func.lineContent}`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: 'gray', marginTop: 1 }, 'Use ↑↓ arrows to select, Enter to confirm'),
  ]);
}

module.exports = { FunctionSelectionStep };
