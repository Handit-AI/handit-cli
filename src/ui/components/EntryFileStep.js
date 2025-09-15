/**
 * Entry File Step Component
 */
function EntryFileStep(React, Box, Text, { entryFile, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step2', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'yellow', bold: true }, '🎯 Step 2: Agent Entry Point'),
    React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 
      'Where does your agent start? This could be an endpoint handler, a main function, or any function that'),
    React.createElement(Text, { key: 'step-description2', color: 'white' }, 
      'initiates your agent\'s execution.'),
    React.createElement(Text, { key: 'step-examples', color: 'gray', marginTop: 1 }, 'Examples:'),
    React.createElement(Text, { key: 'step-example1', color: 'gray' }, '  • Express route handler: app.post("/chat", handleChat)'),
    React.createElement(Text, { key: 'step-example2', color: 'gray' }, '  • Main agent function: startAgent() or processRequest()'),
    React.createElement(Text, { key: 'step-example3', color: 'gray' }, '  • Webhook endpoint: handleWebhook() or processMessage()'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 
      'What is the path to the file containing your agent\'s entry function?'),
    React.createElement(Text, { key: 'step-hint-drag', color: 'gray', marginTop: 1 }, 
      '💡 Tip: You can drag and drop a file from your file explorer to automatically paste its path'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: 'cyan' }, ''),
      React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
      React.createElement(Text, { key: 'input-cursor', color: 'white' }, '_'),
    ]),
    React.createElement(Text, { key: 'step-complete', color: 'green', marginTop: 1 }, '✅ ' + entryFile),
  ]);
}

module.exports = { EntryFileStep };
