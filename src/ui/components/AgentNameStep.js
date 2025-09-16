/**
 * Agent Name Step Component
 */
function AgentNameStep(React, Box, Text, { agentName, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step1', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'yellow', bold: true }, '📝 Step 1: Agent Name'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'Name your agent:'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: 'cyan' }, '> '),
      React.createElement(Box, { 
        key: 'input-field', 
        borderStyle: 'single', 
        borderColor: 'cyan', 
        backgroundColor: 'black',
        minWidth: 20
      }, [
        React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: 'cyan', backgroundColor: 'cyan' }, ' '),
      ]),
    ]),
    React.createElement(Text, { key: 'step-complete', color: 'green', marginTop: 1 }, '✅ ' + agentName),
  ]);
}

module.exports = { AgentNameStep };
