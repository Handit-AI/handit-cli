/**
 * Welcome Header Component for the setup wizard
 */
function WelcomeHeader(React, Text) {
  return [
    React.createElement(Text, { key: 'title', color: '#71f2af', bold: true }, '🚀 Autonomous Engineer Setup'),
    React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Set up autonomous engineering capabilities for your AI agent'),
    React.createElement(Text, { key: 'description', color: '#1f4d53' }, 'Configure monitoring, evaluation, and optimization for continuous improvement'),
    React.createElement(Text, { key: 'separator', color: '#0c272e' }, '─'.repeat(60)),
  ];
}

module.exports = { WelcomeHeader };
