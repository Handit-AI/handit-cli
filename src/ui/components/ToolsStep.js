/**
 * Tools Step Component - Multi-select tools configuration
 */
function ToolsStep(React, Box, Text, { selectedTools = [], selectedToolIndex = 0, isCompleted = false }) {
    const availableTools = ['http_fetch', 'web_search', 'calculator', 'file_io', 'code_run'];
    
    return React.createElement(Box, { key: 'step7', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🛠️ Step 7: Tools Configuration'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Select tools your agent will use'),
      
      // Show completed configuration or interactive selection
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1, flexDirection: 'column' }, [
        React.createElement(Text, { key: 'tools-label', color: '#71f2af', bold: true }, 'Selected Tools:'),
        React.createElement(Text, { key: 'tools-value', color: 'white', marginLeft: 2 }, 
          selectedTools.length > 0 ? selectedTools.join(', ') : 'none'
        )
      ]) : React.createElement(Box, { key: 'step-config', flexDirection: 'column', marginTop: 1 }, [
        
        // Tools selection section
        React.createElement(Box, { key: 'tools-section', flexDirection: 'column' }, [
          React.createElement(Text, { key: 'tools-title', color: '#71f2af', bold: true }, 'Available Tools:'),
          React.createElement(Text, { key: 'tools-instructions', color: '#c8c8c84d', marginTop: 1 }, '(http_fetch: API calls, web_search: Web data, calculator: Math, file_io: File ops, code_run: Code exec)'),
          React.createElement(Box, { key: 'tools-list', flexDirection: 'column', marginTop: 1 }, 
            availableTools.map((tool, index) => {
              const isSelected = selectedTools.includes(tool);
              const isCurrentIndex = selectedToolIndex === index;
              return React.createElement(Box, { 
                key: `tool-${index}`, 
                flexDirection: 'row', 
                marginTop: 1,
                paddingX: 2,
                backgroundColor: isCurrentIndex ? '#0c272e' : 'transparent'
              }, [
                React.createElement(Text, { 
                  key: 'selector', 
                  color: isCurrentIndex ? '#71f2af' : '#c8c8c84d' 
                }, isCurrentIndex ? '▶ ' : '  '),
                React.createElement(Text, { 
                  key: 'tool-number', 
                  color: '#c8c8c84d',
                  marginRight: 1
                }, `${index + 1}. `),
                React.createElement(Text, { 
                  key: 'checkbox', 
                  color: isSelected ? '#71f2af' : '#c8c8c84d' 
                }, isSelected ? '[✓] ' : '[ ] '),
                React.createElement(Text, { 
                  key: 'tool-name', 
                  color: isCurrentIndex ? '#71f2af' : (isSelected ? 'white' : '#c8c8c84d'),
                  bold: isCurrentIndex
                }, tool),
              ]);
            })
          ),
          React.createElement(Text, { key: 'tools-selected', color: '#c8c8c84d', marginTop: 2 }, 
            `\nSelected: ${selectedTools.length > 0 ? selectedTools.join(', ') : 'none'}`
          ),
          React.createElement(Text, { key: 'tools-count', color: '#c8c8c84d' }, 
            `Total: ${selectedTools.length} tool${selectedTools.length !== 1 ? 's' : ''}`
          )
        ])
      ])
    ]);
  }
  
  module.exports = { ToolsStep };
