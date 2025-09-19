/**
 * Tools Step Component - Tools text input
 */
function ToolsStep(React, Box, Text, { tools = '', currentValue = '', isCompleted = false }) {
    return React.createElement(Box, { key: 'step4', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🛠️ Step 4: Tools'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'What tools will your agent use?'),
      React.createElement(Text, { key: 'step-explanation', color: '#c8c8c84d', marginTop: 1 }, 'Tools are functions your agent can call to perform specific tasks.'),
      React.createElement(Text, { key: 'step-example', color: '#c8c8c84d', marginTop: 1 }, 'Enter your tools separated by comma, example: http_fetch, web_search, calculator'),
      
      // Show completed value or input field
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'value-label', color: '#71f2af', bold: true }, 'Tools: '),
        React.createElement(Text, { key: 'value-text', color: 'white' }, tools || 'http_fetch, web_search, calculator')
      ]) : React.createElement(Box, { key: 'step-input', marginTop: 1 }, [
        React.createElement(Text, { key: 'input-label', color: 'white' }, 'Tools: '),
        React.createElement(Text, { key: 'input-value', color: '#71f2af' }, currentValue),
        React.createElement(Text, { key: 'input-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
      ]),
      
    ]);
  }
  
  module.exports = { ToolsStep };
