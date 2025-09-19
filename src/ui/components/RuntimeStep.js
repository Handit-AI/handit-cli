/**
 * Runtime Step Component
 */
function RuntimeStep(React, Box, Text, { runtime, selectedIndex = 0, isCompleted = false }) {
    const runtimes = ['fastapi', 'express', 'cli', 'worker'];
    
    return React.createElement(Box, { key: 'step4', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🚀 Step 4: Runtime'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'How will your agent run?'),
      React.createElement(Text, { key: 'step-instructions', color: '#c8c8c84d', marginTop: 1 }, '(fastapi: Python web API, express: Node.js web server, cli: Command line interface, worker: Background worker)'),
      
      // Show selected runtime if completed, otherwise show selection list
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'final-value', color: '#71f2af' }, runtime)
      ]) : React.createElement(Box, { key: 'step-selection', flexDirection: 'column', marginTop: 1 }, 
        runtimes.map((runtimeOption, index) => 
          React.createElement(Box, { 
            key: `option-${index}`, 
            flexDirection: 'row', 
            marginTop: 1,
            paddingX: 2,
            backgroundColor: selectedIndex === index ? '#0c272e' : 'transparent'
          }, [
            React.createElement(Text, { 
              key: 'selector', 
              color: selectedIndex === index ? '#71f2af' : '#c8c8c84d' 
            }, selectedIndex === index ? '▶ ' : '  '),
            React.createElement(Text, { 
              key: 'runtime-name', 
              color: selectedIndex === index ? '#71f2af' : 'white',
              bold: selectedIndex === index
            }, runtimeOption)
          ])
        )
      ),
    ]);
  }
  
  module.exports = { RuntimeStep };
