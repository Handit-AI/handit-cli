/**
 * Welcome Header Component for the setup wizard
 */
function WelcomeHeaderScaffolding(React, Text) {
    return [
      React.createElement(Text, { key: 'welcome', color: '#71f2af', bold: true }, '💻 Setup your AI project!'),
      React.createElement(Text, { key: 'process-1', color: '#c8c8c84d' }, 'Create the scaffolding for your AI project.'),
      React.createElement(Text, { key: 'separator', color: '#0c272e', marginTop: 1 }, '─'.repeat(60)),
    ];
  }
  
  module.exports = { WelcomeHeaderScaffolding };
  