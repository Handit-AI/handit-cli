/**
 * Agent Name Step Component
 */
function AgentNameStep(React, Box, Text, { agentName, onInput, currentValue }) {
  return React.createElement(Box, { key: 'step1', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '📝 Step 1: Agent Name'),
    React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Give your agent a descriptive name. This helps identify it in monitoring and logs.'),
    React.createElement(Text, { key: 'step-examples', color: '#c8c8c84d', marginTop: 1 }, 'For example: "Loan Risk Analyzer", "Customer Support Bot", "Document Processor"'),
    React.createElement(Box, { key: 'step-input', flexDirection: 'row', marginTop: 1 }, [
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

module.exports = { AgentNameStep };
