/**
 * Todo List Component - Shows steps with checkboxes that turn into checkmarks when completed
 */
function TodoList(React, Box, Text, { steps, currentStep, completedSteps = [] }) {
  return React.createElement(Box, { key: 'todo-list', flexDirection: 'column', marginTop: 1 }, 
    steps.map((step, index) => {
      const stepNumber = index + 1;
      const isCompleted = completedSteps.includes(stepNumber);
      const isCurrent = currentStep === stepNumber;
      
      // Icon: checkbox if not completed, checkmark if completed
      const icon = isCompleted ? '✅' : '☐';
      const color = isCompleted ? '#71f2af' : isCurrent ? '#ffd700' : '#c8c8c84d';
      
      return React.createElement(Box, { 
        key: `todo-step-${stepNumber}`, 
        flexDirection: 'row', 
        marginTop: 0.5 
      }, [
        React.createElement(Text, { 
          key: `todo-icon-${stepNumber}`, 
          color: color, 
          marginRight: 1 
        }, icon),
        React.createElement(Text, { 
          key: `todo-text-${stepNumber}`, 
          color: color 
        }, step)
      ]);
    })
  );
}

module.exports = { TodoList };
