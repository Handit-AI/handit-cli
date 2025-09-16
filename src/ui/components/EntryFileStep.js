/**
 * Entry File Step Component
 */
function EntryFileStep(React, Box, Text, { entryFile, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step2', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🎯 Step 2: Entry Point File'),
    React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'This is the main file where your agent starts running.'),
    React.createElement(Text, { key: 'step-examples', color: '#c8c8c84d', marginTop: 1 }, 'For example: "main.py", "app.js", "index.ts", "server.py"'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: '#c8c8c84d', 
        backgroundColor: '#0c272e',
        minWidth: 30,
        paddingX: 1
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
    ]),
  ]);
}

module.exports = { EntryFileStep };
