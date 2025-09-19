/**
 * Agent Step Component - LLM Nodes text input
 */
function AgentStep(React, Box, Text, { llmNodes = '', currentValue = '', isCompleted = false }) {
    return React.createElement(Box, { key: 'step3', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🤖 Step 3: LLM Nodes'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'What are the names of your llm nodes?'),
      React.createElement(Text, { key: 'step-explanation', color: '#c8c8c84d', marginTop: 1 }, 'LLM nodes are workflow steps where a large language model does a task.'),
      React.createElement(Text, { key: 'step-example', color: '#c8c8c84d', marginTop: 1 }, 'Introduce your llm nodes separated by comma, example: reason, act, assistant_composer'),
      
      // Show completed value or input field
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'value-label', color: '#71f2af', bold: true }, 'LLM Nodes: '),
        React.createElement(Text, { key: 'value-text', color: 'white' }, llmNodes || 'reason, act, assistant_composer')
      ]) : React.createElement(Box, { key: 'step-input', marginTop: 1 }, [
        React.createElement(Text, { key: 'input-label', color: 'white' }, 'LLM Nodes: '),
        React.createElement(Text, { key: 'input-value', color: '#71f2af' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
      
    ]);
  }
  
  module.exports = { AgentStep };
