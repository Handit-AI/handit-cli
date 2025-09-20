/**
 * Project Success Step Component
 * Shows a clean success message when project is created
 */

const React = require('react');
const { Box, Text } = require('ink');

function ProjectSuccessStep({ projectName, projectPath, onComplete }) {
  return React.createElement(Box, { 
    key: 'project-success',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderStyle: 'round',
    borderColor: 'green'
  }, [
    React.createElement(Text, { 
      key: 'success-icon', 
      color: 'green', 
      bold: true 
    }, '✅'),
    React.createElement(Text, { 
      key: 'success-title', 
      color: 'green', 
      bold: true,
      marginTop: 1
    }, 'Project Created Successfully!'),
    React.createElement(Text, { 
      key: 'project-name', 
      color: 'blue',
      marginTop: 1
    }, `📁 ${projectName}`),
    React.createElement(Text, { 
      key: 'project-path', 
      color: 'gray',
      marginTop: 1
    }, `📂 ${projectPath}`),
    React.createElement(Text, { 
      key: 'next-steps', 
      color: 'yellow',
      marginTop: 2
    }, 'Next steps:'),
    React.createElement(Text, { 
      key: 'step-1', 
      color: 'white',
      marginTop: 1
    }, '1. cd into your project directory'),
    React.createElement(Text, { 
      key: 'step-2', 
      color: 'white'
    }, '2. Install dependencies'),
    React.createElement(Text, { 
      key: 'step-3', 
      color: 'white'
    }, '3. Set up environment variables'),
    React.createElement(Text, { 
      key: 'step-4', 
      color: 'white'
    }, '4. Customize your agent logic'),
    React.createElement(Text, { 
      key: 'step-5', 
      color: 'white'
    }, '5. Run your agent!'),
    React.createElement(Text, { 
      key: 'press-enter', 
      color: 'gray',
      marginTop: 2
    }, 'Press Enter to exit...')
  ]);
}

module.exports = { ProjectSuccessStep };
