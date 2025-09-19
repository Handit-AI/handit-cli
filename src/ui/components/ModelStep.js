/**
 * Model Step Component - Model provider and name selection
 */
function ModelStep(React, Box, Text, { provider = '', modelName = '', selectedProviderIndex = 0, currentMode = 'provider', isCompleted = false }) {
    const providers = [
        { name: 'mock', description: 'offline default' },
        { name: 'ollama', description: 'local models' }
    ];
    
    const getModelExamples = (provider) => {
        switch (provider) {
            case 'mock':
                return ['mock-llm', 'test-model', 'dev-assistant'];
            case 'ollama':
                return ['llama3.1', 'mistral', 'codellama'];
            default:
                return ['mock-llm'];
        }
    };
    
    const currentExamples = getModelExamples(provider);
    
    return React.createElement(Box, { key: 'step8', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🤖 Step 8: Model Configuration'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Configure your AI model provider and name'),
      
      // Show completed configuration or interactive selection
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1, flexDirection: 'column' }, [
        React.createElement(Text, { key: 'provider-label', color: '#71f2af', bold: true }, 'Model Configuration:'),
        React.createElement(Text, { key: 'provider-value', color: 'white', marginLeft: 2 }, `Provider: ${provider}`),
        React.createElement(Text, { key: 'model-value', color: 'white', marginLeft: 2 }, `Model: ${modelName}`)
      ]) : React.createElement(Box, { key: 'step-config', flexDirection: 'column', marginTop: 1 }, [
        
        // Provider selection mode
        currentMode === 'provider' ? React.createElement(Box, { key: 'provider-mode', flexDirection: 'column' }, [
          React.createElement(Text, { key: 'provider-title', color: '#71f2af', bold: true }, 'Select Provider:'),
          React.createElement(Text, { key: 'provider-instructions', color: '#c8c8c84d', marginTop: 1 }, 'Use arrow keys to select, Enter to confirm'),
          React.createElement(Box, { key: 'provider-list', flexDirection: 'column', marginTop: 1 }, 
            providers.map((prov, index) => {
              const isSelected = selectedProviderIndex === index;
              return React.createElement(Box, { 
                key: `provider-${index}`, 
                flexDirection: 'row', 
                marginTop: 1,
                paddingX: 2,
                backgroundColor: isSelected ? '#0c272e' : 'transparent'
              }, [
                React.createElement(Text, { 
                  key: 'selector', 
                  color: isSelected ? '#71f2af' : '#c8c8c84d' 
                }, isSelected ? '▶ ' : '  '),
                React.createElement(Text, { 
                  key: 'provider-name', 
                  color: isSelected ? 'white' : '#c8c8c84d',
                  bold: isSelected
                }, prov.name),
                React.createElement(Text, { 
                  key: 'provider-description', 
                  color: '#c8c8c84d',
                  marginLeft: 2
                }, `(${prov.description})`)
              ]);
            })
          ),
          React.createElement(Text, { key: 'provider-selected', color: '#c8c8c84d', marginTop: 2 }, 
            `\nSelected: ${providers[selectedProviderIndex]?.name || 'none'}`
          )
        ]) : null,
        
        // Model name input mode
        currentMode === 'model' ? React.createElement(Box, { key: 'model-mode', flexDirection: 'column' }, [
          React.createElement(Text, { key: 'model-title', color: '#71f2af', bold: true }, 'Model Name:'),
          React.createElement(Text, { key: 'model-instructions', color: '#c8c8c84d', marginTop: 1 }, 'Enter model identifier, press Enter to confirm'),
          
          // Model input field
          React.createElement(Box, {
            key: 'model-input-field',
            borderStyle: 'single',
            borderColor: '#c8c8c84d',
            backgroundColor: '#0c272e',
            minWidth: 20,
            paddingX: 1,
            marginTop: 1
          }, [
            React.createElement(Text, { key: 'model-value', color: 'white' }, modelName),
            React.createElement(Text, { key: 'model-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
          ]),
          
          // Model examples based on provider
          React.createElement(Text, { key: 'model-examples-label', color: '#c8c8c84d', marginTop: 2 }, 
            `Examples for ${provider}:`
          ),
          React.createElement(Box, { key: 'model-examples', flexDirection: 'column', marginLeft: 2 }, 
            currentExamples.map((example, index) => 
              React.createElement(Text, { 
                key: `example-${index}`, 
                color: '#c8c8c84d',
                marginTop: 1
              }, `• ${example}`)
            )
          ),
          
          React.createElement(Text, { key: 'model-note', color: '#c8c8c84d', marginTop: 2 }, 
            'Type model name and press Enter to finish'
          )
        ]) : null
      ])
    ]);
  }
  
  module.exports = { ModelStep };
