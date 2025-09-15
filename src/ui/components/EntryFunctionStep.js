/**
 * Entry Function Step Component
 */
function EntryFunctionStep(React, Box, Text, { entryFunction, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step3', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'yellow', bold: true }, '⚡ Step 3: Entry Function'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 
      'What is the name of the function or the endpoint that starts your agent?'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: 'cyan' }, ''),
      React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
      React.createElement(Text, { key: 'input-cursor', color: 'white' }, '_'),
    ]),
    React.createElement(Text, { key: 'step-complete', color: 'green', marginTop: 1 }, '✅ ' + entryFunction),
  ]);
}

module.exports = { EntryFunctionStep };
