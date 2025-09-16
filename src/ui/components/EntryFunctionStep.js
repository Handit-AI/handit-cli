/**
 * Entry Function Step Component
 */
function EntryFunctionStep(React, Box, Text, { entryFunction, onInput, currentValue, isCompleted = false }) {
  return React.createElement(Box, { key: 'step3', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '⚡ Step 3: Entry Function'),
    React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'This is the main function that starts your agent.'),
    React.createElement(Text, { key: 'step-examples', color: '#c8c8c84d', marginTop: 1 }, 'For example: "main", "run", "start", "handle", "process"'),
    
    // Show input field if not completed, otherwise show final value
    isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
      React.createElement(Text, { key: 'final-value', color: '#71f2af' }, entryFunction)
    ]) : React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: '#c8c8c84d', 
        backgroundColor: '#0c272e',
        minWidth: 20,
        paddingX: 1
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
    ]),
  ]);
}

module.exports = { EntryFunctionStep };
