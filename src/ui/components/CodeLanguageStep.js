/**
 * Code Language Step Component
 */
function CodeLanguageStep(React, Box, Text, { codeLanguage, selectedIndex = 0, isCompleted = false }) {
    const languages = ['Python', 'JavaScript'];
    
    return React.createElement(Box, { key: 'step2', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '⚙️ Step 2: Code Language'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Which programming language will you use?'),
      
      // Show selected language if completed, otherwise show selection list
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1 }, [
        React.createElement(Text, { key: 'final-value', color: '#71f2af' }, codeLanguage)
      ]) : React.createElement(Box, { key: 'step-selection', flexDirection: 'column', marginTop: 1 }, 
        languages.map((language, index) => 
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
              key: 'language-name', 
              color: selectedIndex === index ? '#71f2af' : 'white',
              bold: selectedIndex === index
            }, language)
          ])
        )
      ),
    ]);
  }
  
  module.exports = { CodeLanguageStep };
