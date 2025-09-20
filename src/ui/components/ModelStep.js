/**
 * Model Step Component - LLM Provider dropdown selection
 */
function ModelStep(React, Box, Text, { llmProvider = '', selectedIndex = 0, isCompleted = false }) {
    const providers = ['ChatGPT', 'Gemini', 'Llama'];
    
    return React.createElement(Box, { key: 'step5', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🤖 Step 5: LLM Provider'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Select your LLM Provider:'),
      
      // Show completed value or dropdown
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'value-label', color: '#71f2af', bold: true }, 'LLM Provider: '),
        React.createElement(Text, { key: 'value-text', color: 'white' }, llmProvider || 'ChatGPT')
      ]) : React.createElement(Box, { key: 'step-dropdown', marginTop: 1, flexDirection: 'column' }, 
        providers.map((provider, index) => 
          React.createElement(Text, { 
            key: `provider-${index}`,
            color: index === selectedIndex ? 'black' : 'gray',
            backgroundColor: index === selectedIndex ? '#71f2af' : undefined
          }, `${index === selectedIndex ? '► ' : '  '}${provider}`)
        )
      ),
      
    ]);
  }
  
  module.exports = { ModelStep };
