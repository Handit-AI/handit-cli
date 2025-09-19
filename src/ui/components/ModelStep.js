/**
 * Model Step Component - LLM Provider text input
 */
function ModelStep(React, Box, Text, { llmProvider = '', currentValue = '', isCompleted = false }) {
    return React.createElement(Box, { key: 'step5', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🤖 Step 5: LLM Provider'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'What is your LLM Provider?'),
      React.createElement(Text, { key: 'step-example', color: '#c8c8c84d', marginTop: 1 }, 'example: LLAMA, ChatGPT, Claude'),
      
      // Show completed value or input field
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'value-label', color: '#71f2af', bold: true }, 'LLM Provider: '),
        React.createElement(Text, { key: 'value-text', color: 'white' }, llmProvider || 'ChatGPT')
      ]) : React.createElement(Box, { key: 'step-input', marginTop: 1 }, [
        React.createElement(Text, { key: 'input-label', color: 'white' }, 'LLM Provider: '),
        React.createElement(Text, { key: 'input-value', color: '#71f2af' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
      
    ]);
  }
  
  module.exports = { ModelStep };
