/**
 * Framework Step Component
 */
function FrameworkStep(React, Box, Text, { framework, selectedIndex = 0, isCompleted = false }) {
    const frameworks = ['Base', 'LangChain', 'LangGraph'];
    
    return React.createElement(Box, { key: 'step3', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🔧 Step 3: Framework'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Which framework do you want to use?'),
      React.createElement(Text, { key: 'step-instructions', color: '#c8c8c84d', marginTop: 1 }, '(Base: Pure implementation, LangChain: LangChain framework, LangGraph: LangGraph framework)'),
      
      // Show selected framework if completed, otherwise show selection list
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'final-value', color: '#71f2af' }, framework)
      ]) : React.createElement(Box, { key: 'step-selection', flexDirection: 'column', marginTop: 1 }, 
        frameworks.map((frameworkOption, index) => 
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
              key: 'framework-name', 
              color: selectedIndex === index ? '#71f2af' : 'white',
              bold: selectedIndex === index
            }, frameworkOption)
          ])
        )
      ),
    ]);
  }
  
  module.exports = { FrameworkStep };
