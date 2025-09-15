/**
 * Agent Name Step Component
 */
function AgentNameStep(React, Box, Text, { agentName, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step1', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'yellow', bold: true }, '📝 Step 1: Agent Information'),
    React.createElement(Text, { key: 'step-question', color: 'white', marginTop: 1 }, 'What would you like to name your agent?'),
    React.createElement(Text, { key: 'step-hint', color: 'gray', marginTop: 1 }, '[my-agent]'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
      React.createElement(Text, { key: 'input-prompt', color: 'cyan' }, ''),
      React.createElement(Text, { key: 'input-value', color: 'white' }, currentValue),
      React.createElement(Text, { key: 'input-cursor', color: 'white' }, '_'),
    ]),
    React.createElement(Text, { key: 'step-complete', color: 'green', marginTop: 1 }, '✅ ' + agentName),
  ]);
}

module.exports = { AgentNameStep };
