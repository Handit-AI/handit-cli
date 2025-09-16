/**
 * Welcome Header Component for the setup wizard
 */
function WelcomeHeader(React, Text) {
  return [
    React.createElement(Text, { key: 'welcome', color: '#71f2af', bold: true }, '👋 Welcome to Handit'),
    React.createElement(Text, { key: 'title', color: 'white', bold: true }, 'Setup your Handit teammate!'),
    React.createElement(Text, { key: 'process-1', color: '#c8c8c84d' }, 'Ship reliable AI faster. Handit will catch hallucinations, extraction errors & PII'),
    React.createElement(Text, { key: 'process-2', color: '#c8c8c84d' }, 'and will create verified, tested fixes you approve locally and in prod.'),
    React.createElement(Text, { key: 'separator', color: '#0c272e', marginTop: 1 }, '─'.repeat(60)),
  ];
}

module.exports = { WelcomeHeader };
