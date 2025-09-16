/**
 * Entry File Step Component
 */
function EntryFileStep(React, Box, Text, { entryFile, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step2', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🎯 Step 2: Entry File'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'Enter the file path (we\'ll help you find the exact file):'),
    React.createElement(Text, { key: 'step-hint', color: '#1f4d53', marginTop: 1 }, '💡 Tip: You can drag & drop a file or type the path'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: '#71f2af' }, '> '),
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: '#1f4d53', 
        backgroundColor: '#0c272e',
        minWidth: 30,
        paddingX: 1
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
    ]),
    entryFile ? React.createElement(Text, { key: 'step-complete', color: '#71f2af', marginTop: 1 }, '✅ ' + entryFile) : null,
  ]);
}

module.exports = { EntryFileStep };
