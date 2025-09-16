/**
 * Function Selection Step Component
 */
function FunctionSelectionStep(React, Box, Text, { functions, selectedIndex, onSelect, selectedFile }) {
  return React.createElement(Box, { key: 'step6-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, `🔍 Select Function`),
    React.createElement(Box, { key: 'step-progress', marginTop: 2, flexDirection: 'column' }, [
      React.createElement(Text, { key: 'step-status', color: '#c8c8c84d' }, '🔍 Analyzing functions in file...'),
      React.createElement(Box, { key: 'step-bar', marginTop: 1, width: 40 }, [
        React.createElement(Text, { key: 'step-bar-fill', backgroundColor: '#71f2af' }, '█'.repeat(Math.floor(100 / 2.5))),
        React.createElement(Text, { key: 'step-bar-empty', color: '#0c272e' }, '░'.repeat(40 - Math.floor(100 / 2.5))),
      ]),
    ]),
    React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 2 }, `Found ${functions.length} functions. Choose the correct one:`),
    React.createElement(Text, { key: 'step-file-path', color: '#c8c8c84d', marginTop: 1 }, `📄 File: ${selectedFile}`),
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
          paddingY: selectedIndex === index ? 1 : 0
        }, [
          React.createElement(Box, { key: `func-header-${index}`, flexDirection: 'row' }, [
            React.createElement(Text, { 
              key: `func-indicator-${index}`, 
              color: '#c8c8c84d',
              marginRight: 2
            }, selectedIndex === index ? '►' : ' '),
            React.createElement(Text, { 
              key: `func-type-${index}`, 
              color: 'white',
              marginRight: 1
            }, func.type === 'endpoint' ? '🌐' : func.type === 'method' ? '🔧' : func.type === 'handler' ? '📡' : '⚙️'),
            React.createElement(Text, { 
              key: `func-name-${index}`, 
              color: 'gray'
            }, `${func.name} (line ${func.line})`),
          ]),
          // Show function preview for all items
          React.createElement(Text, { 
            key: `func-code-${index}`, 
            color: '#c8c8c84d',
            marginLeft: selectedIndex === index ? 4 : 2
          }, `  - ${func.lineContent}`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: '#71f2af', marginTop: 1 }, '💡 Use ↑↓ arrows to browse options, Enter to select'),
  ]);
}

module.exports = { FunctionSelectionStep };
