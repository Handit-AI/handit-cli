/**
 * Function Selection Step Component
 */
function FunctionSelectionStep(React, Box, Text, { functions, selectedIndex, onSelect, selectedFile }) {
  return React.createElement(Box, { key: 'step6-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, `🔍 Select Function`),
    React.createElement(Box, { key: 'step-progress', marginTop: 2, flexDirection: 'column' }, [
      React.createElement(Text, { key: 'step-status', color: '#1f4d53' }, '🔍 Analyzing functions in file...'),
      React.createElement(Box, { key: 'step-bar', marginTop: 1, width: 40 }, [
        React.createElement(Text, { key: 'step-bar-fill', backgroundColor: '#71f2af' }, '█'.repeat(Math.floor(100 / 2.5))),
        React.createElement(Text, { key: 'step-bar-empty', color: '#0c272e' }, '░'.repeat(40 - Math.floor(100 / 2.5))),
      ]),
    ]),
    React.createElement(Text, { key: 'step-description', color: '#1f4d53', marginTop: 2 }, 'Choose the correct function:'),
    React.createElement(Box, { key: 'step-options', marginTop: 2, flexDirection: 'column' },
      functions.map((func, index) => 
        React.createElement(Box, { 
          key: `func-option-${index}`, 
          flexDirection: 'column', 
          marginBottom: 1,
          borderStyle: selectedIndex === index ? 'single' : undefined,
          borderColor: selectedIndex === index ? '#71f2af' : undefined,
          backgroundColor: selectedIndex === index ? '#0c272e' : undefined,
          paddingX: selectedIndex === index ? 1 : 0,
          paddingY: selectedIndex === index ? 0.5 : 0
        }, [
          React.createElement(Box, { key: `func-header-${index}`, flexDirection: 'row' }, [
            React.createElement(Text, { 
              key: `func-indicator-${index}`, 
              color: selectedIndex === index ? '#71f2af' : '#1f4d53',
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
            color: selectedIndex === index ? '#71f2af' : '#1f4d53',
            marginLeft: 2
          }, `  - ${func.lineContent}`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: '#1f4d53', marginTop: 1 }, '↑↓ to select, Enter to confirm'),
  ]);
}

module.exports = { FunctionSelectionStep };
