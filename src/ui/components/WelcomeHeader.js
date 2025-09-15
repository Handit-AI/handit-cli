/**
 * Welcome Header Component for the setup wizard
 */
function WelcomeHeader(React, Text) {
  return [
    React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '🚀 Autonomous Engineer Setup'),
    React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Transform your AI agent into an autonomous engineer'),
    React.createElement(Text, { key: 'description', color: 'yellow' }, 'Configure monitoring, evaluation, and optimization for continuous improvement'),
    React.createElement(Text, { key: 'separator', color: 'gray' }, '─'.repeat(60)),
  ];
}

module.exports = { WelcomeHeader };
