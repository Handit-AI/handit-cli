/**
 * File Detection Step Component
 */
function FileDetectionStep(React, Box, Text, { status, progress }) {
  return React.createElement(Box, { key: 'step5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'cyan', bold: true }, '🔍 Smart File Detection'),
    React.createElement(Text, { key: 'step-description', color: 'yellow', marginTop: 1 }, 'Using AI to find the correct file and function...'),
    React.createElement(Box, { key: 'step-progress', marginTop: 2, flexDirection: 'column' }, [
      React.createElement(Text, { key: 'step-status', color: 'yellow' }, status || '🔍 Analyzing functions in file...'),
      React.createElement(Box, { key: 'step-bar', marginTop: 1, width: 40 }, [
        React.createElement(Text, { key: 'step-bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor((progress || 0) / 2.5))),
        React.createElement(Text, { key: 'step-bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor((progress || 0) / 2.5))),
      ]),
    ]),
  ]);
}

module.exports = { FileDetectionStep };
