/**
 * Entry Function Step Component
 */
function EntryFunctionStep(React, Box, Text, { entryFunction, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step3', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '⚡ Step 3: Entry Function'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'Enter the function name (we\'ll help you find the exact function):'),
    React.createElement(Text, { key: 'step-hint', color: '#1f4d53', marginTop: 1 }, '💡 Tip: Just type the function name, we\'ll find it in the file'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: '#71f2af' }, '> '),
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: '#1f4d53', 
        backgroundColor: '#0c272e',
        minWidth: 20,
        paddingX: 1
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
    ]),
    entryFunction ? React.createElement(Text, { key: 'step-complete', color: '#71f2af', marginTop: 1 }, '✅ ' + entryFunction) : null,
  ]);
}

module.exports = { EntryFunctionStep };
