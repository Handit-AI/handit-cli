/**
 * Entry File Step Component
 */
function EntryFileStep(React, Box, Text, { entryFile, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step2', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'yellow', bold: true }, '🎯 Step 2: Entry File'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'File path to your agent\'s main function:'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: 'cyan' }, '> '),
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: 'cyan', 
        backgroundColor: 'black',
        minWidth: 30
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: 'cyan', backgroundColor: 'cyan' }, ' '),
      ]),
    ]),
    React.createElement(Text, { key: 'step-complete', color: 'green', marginTop: 1 }, '✅ ' + entryFile),
  ]);
}

module.exports = { EntryFileStep };
