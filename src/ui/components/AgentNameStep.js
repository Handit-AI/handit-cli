/**
 * Agent Name Step Component
 */
function AgentNameStep(React, Box, Text, { agentName, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step1', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '📝 Step 1: Agent Name'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'Name your agent:'),
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
    React.createElement(Text, { key: 'step-complete', color: '#71f2af', marginTop: 1 }, '✅ ' + agentName),
  ]);
}

module.exports = { AgentNameStep };
