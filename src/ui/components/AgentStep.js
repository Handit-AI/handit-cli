/**
 * Agent Step Component - Multi-select stages and subagents configuration
 */
function AgentStep(React, Box, Text, { selectedStages = [], subAgents = 0, currentMode = 'stages', selectedStageIndex = 0, isCompleted = false }) {
    const availableStages = ['retrieve', 'reason', 'act'];
    
    return React.createElement(Box, { key: 'step6', flexDirection: 'column', marginTop: 2 }, [
      React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '🤖 Step 6: Agent Configuration'),
      React.createElement(Text, { key: 'step-description', color: 'white', marginTop: 1 }, 'Configure your agent stages and subagents'),
      
      // Show completed configuration or interactive selection
      isCompleted ? React.createElement(Box, { key: 'step-value', marginTop: 1, flexDirection: 'column' }, [
        React.createElement(Text, { key: 'stages-label', color: '#71f2af', bold: true }, 'Stages:'),
        React.createElement(Text, { key: 'stages-value', color: 'white', marginLeft: 2 }, selectedStages.join(', ')),
        React.createElement(Text, { key: 'subagents-label', color: '#71f2af', bold: true, marginTop: 1 }, 'SubAgents:'),
        React.createElement(Text, { key: 'subagents-value', color: 'white', marginLeft: 2 }, subAgents.toString())
      ]) : React.createElement(Box, { key: 'step-config', flexDirection: 'column', marginTop: 1 }, [
        
        // Stages selection section
        currentMode === 'stages' ? React.createElement(Box, { key: 'stages-section', flexDirection: 'column' }, [
          React.createElement(Text, { key: 'stages-title', color: '#71f2af', bold: true }, 'Select Stages:'),
          React.createElement(Text, { key: 'stages-instructions', color: '#c8c8c84d', marginTop: 1 }, '(retrieve: Data gathering, reason: Analysis & planning, act: Action execution)'),
          React.createElement(Box, { key: 'stages-list', flexDirection: 'column', marginTop: 1 }, 
            availableStages.map((stage, index) => {
              const isSelected = selectedStages.includes(stage);
              const isCurrentIndex = selectedStageIndex === index;
              return React.createElement(Box, { 
                key: `stage-${index}`, 
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
                  key: 'checkbox', 
                  color: isSelected ? '#71f2af' : '#c8c8c84d' 
                }, isSelected ? '[✓] ' : '[ ] '),
                React.createElement(Text, { 
                  key: 'stage-name', 
                  color: isCurrentIndex ? '#71f2af' : (isSelected ? 'white' : '#c8c8c84d'),
                  bold: isCurrentIndex
                }, stage)
              ]);
            })
          ),
          React.createElement(Text, { key: 'stages-selected', color: '#c8c8c84d', marginTop: 1 }, 
            `Selected: ${selectedStages.length > 0 ? selectedStages.join(', ') : 'none'}`
          )
        ]) : null,
        
        // SubAgents configuration section
        currentMode === 'subagents' ? React.createElement(Box, { key: 'subagents-section', flexDirection: 'column' }, [
          React.createElement(Text, { key: 'subagents-title', color: '#71f2af', bold: true }, 'Number of SubAgents (0-9, Enter to confirm):'),
          React.createElement(Box, { key: 'subagents-input', marginTop: 1, paddingX: 2 }, [
            React.createElement(Text, { key: 'subagents-label', color: 'white' }, 'SubAgents: '),
            React.createElement(Text, { key: 'subagents-value', color: '#71f2af', bold: true }, subAgents.toString()),
            React.createElement(Text, { key: 'subagents-cursor', color: '#71f2af', backgroundColor: '#71f2af' }, '█'),
          ]),
          React.createElement(Text, { key: 'subagents-help', color: '#c8c8c84d', marginTop: 1 }, 
            '\nHelper agents for specialized tasks (default: 0)'
          )
        ]) : null
      ]),
      
    ]);
  }
  
  module.exports = { AgentStep };
