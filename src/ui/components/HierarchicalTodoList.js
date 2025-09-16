/**
 * Hierarchical Todo List Component - Professional tree structure like the image
 */
function HierarchicalTodoList(React, Box, Text, { title = "Update Todos", mainTask, subTasks, currentStep, completedSteps = [] }) {
  return React.createElement(Box, { key: 'hierarchical-todo', flexDirection: 'column' }, [
    // Title with green bullet like in the image
    React.createElement(Box, { key: 'todo-title', flexDirection: 'row', marginBottom: 1 }, [
      React.createElement(Text, { key: 'title-bullet', color: '#71f2af' }, '● '),
      React.createElement(Text, { key: 'title-text', color: 'white', bold: true }, title)
    ]),
    
    // Main task with proper indentation
    React.createElement(Box, { key: 'main-task', flexDirection: 'row', marginLeft: 2 }, [
      React.createElement(Text, { key: 'main-task-checkbox', color: 'white', marginRight: 1 }, '  '),
      React.createElement(Text, { key: 'main-task-text', color: 'white' }, mainTask)
    ]),
    
    // Vertical line connector
    React.createElement(Box, { key: 'vertical-line', flexDirection: 'row', marginLeft: 3 }, [
      React.createElement(Text, { key: 'line-char', color: '#c8c8c84d' }, ' │')
    ]),
    
    // Sub-tasks with proper tree structure
    ...subTasks.map((subTask, index) => {
      const stepNumber = index + 1;
      const isCompleted = completedSteps.includes(stepNumber);
      const isCurrent = currentStep === stepNumber;
      const isLast = index === subTasks.length - 1;
      
      // Determine checkbox and connector based on state
      let checkbox, connector, textColor;
      if (isCompleted) {
        checkbox = '✅';
        textColor = 'white';
      } else if (isCurrent) {
        checkbox = '⏳';
        textColor = '#ffd700'; // Gold for current
      } else {
        checkbox = '□';
        textColor = '#c8c8c84d';
      }
      
      // Tree connector - L shape for last item, T shape for others
      const treeConnector = isLast ? '└─' : '├─';
      
      return React.createElement(Box, { 
        key: `sub-task-${stepNumber}`, 
        flexDirection: 'row', 
        marginLeft: 4
      }, [
        React.createElement(Text, { 
          key: `sub-task-connector-${stepNumber}`, 
          color: '#c8c8c84d',
          marginRight: 1
        }, treeConnector),
        React.createElement(Text, { 
          key: `sub-task-checkbox-${stepNumber}`, 
          color: 'white',
          marginRight: 3
        }, checkbox),
        React.createElement(Text, { 
          key: `sub-task-text-${stepNumber}`, 
          color: textColor,
          marginLeft: 1,
        }, ' ' + subTask)
      ]);
    })
  ]);
}

module.exports = { HierarchicalTodoList };
