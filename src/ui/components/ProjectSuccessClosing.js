function ProjectSuccessClosing(React, Box, Text, projectName, projectPath) {
  return React.createElement(Box, { 
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderStyle: 'round',
    borderColor: 'green'
  }, [
    React.createElement(Text, { key: 'success', color: '#71f2af', bold: true }, '🎉 Project created successfully!'),
    React.createElement(Text, { key: 'project-name', color: 'white', marginTop: 1 }, `📁 ${projectName}`),
    React.createElement(Text, { key: 'project-path', color: 'white' }, `📂 ${projectPath}`),
    React.createElement(Text, { key: 'separator', color: '#0c272e', marginTop: 1 }, '─'.repeat(60)),
    React.createElement(Text, { key: 'next-steps', color: '#71f2af', bold: true, marginTop: 1 }, 'Next steps:'),
    React.createElement(Text, { key: 'step-1', color: 'gray' }, '1. cd into your project directory'),
    React.createElement(Text, { key: 'step-2', color: 'gray' }, '2. Install dependencies'),
    React.createElement(Text, { key: 'step-3', color: 'gray' }, '3. Set up environment variables'),
    React.createElement(Text, { key: 'step-4', color: 'gray' }, '4. Customize your agent logic'),
    React.createElement(Text, { key: 'step-5', color: 'gray', marginBottom: 1 }, '5. Run your agent!'),
    React.createElement(Text, { key: 'exit-prompt', color: 'gray', dimColor: true, marginTop: 2 }, 'Press Enter to exit...')
  ]);
}

module.exports = { ProjectSuccessClosing };
