/**
 * Orchestration Style Step Component
 */
function OrchestrationStyleStep(React, Box, Text, { orchestrationStyle, selectedIndex = 0, isCompleted = false }) {
    const orchestrationStyles = ['pipeline', 'router', 'state-graph'];
    
    return React.createElement(Box, { key: 'step5', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🔄 Step 5: Orchestration Style'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'How will your agent orchestrate tasks?'),
      React.createElement(Text, { key: 'step-instructions', color: '#c8c8c84d', marginTop: 1 }, '(pipeline: Sequential flow, router: Conditional routing, state-graph: LangGraph)'),
      
      // Show selected orchestration style if completed, otherwise show selection list
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'final-value', color: '#71f2af' }, orchestrationStyle)
      ]) : React.createElement(Box, { key: 'step-selection', flexDirection: 'column', marginTop: 1 }, 
        orchestrationStyles.map((styleOption, index) => 
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
              key: 'style-name', 
              color: selectedIndex === index ? '#71f2af' : 'white',
              bold: selectedIndex === index
            }, styleOption)
          ])
        )
      ),
    ]);
  }
  
  module.exports = { OrchestrationStyleStep };
