/**
 * Checklist Component - Shows steps with checkboxes that turn into checkmarks when completed
 */
function Checklist(React, Box, Text, { steps, completedSteps = [] }) {
  return React.createElement(Box, { key: 'checklist', flexDirection: 'column' }, 
    steps.map((step, index) => {
      const stepNumber = index + 1;
      const isCompleted = completedSteps.includes(stepNumber);
      
      // Icon: checkbox if not completed, checkmark if completed
      const icon = isCompleted ? '✅' : '☐';
      const color = isCompleted ? '#71f2af' : '#c8c8c84d';
      
      return React.createElement(Box, { 
        key: `checklist-step-${stepNumber}`, 
        flexDirection: 'row', 
        marginTop: 0.5,
        marginLeft: 2
      }, [
        React.createElement(Text, { 
          key: `checklist-icon-${stepNumber}`, 
          color: color, 
          marginRight: 1 
        }, icon),
        React.createElement(Text, { 
          key: `checklist-text-${stepNumber}`, 
          color: color,
          dimColor: !isCompleted
        }, step)
      ]);
    })
  );
}

module.exports = { Checklist };
