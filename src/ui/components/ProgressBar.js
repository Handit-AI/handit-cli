/**
 * Progress Bar Component
 */
function ProgressBar(React, Box, Text, { progress = 0, width = 40, color = 'blue' }) {
  const filled = Math.floor((progress || 0) / 2.5);
  const empty = width - filled;
  
  return React.createElement(Box, { key: 'progress-bar', flexDirection: 'row' }, [
    React.createElement(Text, { key: 'progress-fill', backgroundColor: color }, '█'.repeat(filled)),
    React.createElement(Text, { key: 'progress-empty', color: 'gray' }, '░'.repeat(empty)),
  ]);
}

module.exports = { ProgressBar };
