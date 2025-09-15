/**
 * File Selection Step Component
 */
function FileSelectionStep(React, Box, Text, { possibleFiles, selectedIndex, onSelect }) {
  return React.createElement(Box, { key: 'step5-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'cyan', bold: true }, '📁 File Selection'),
    React.createElement(Text, { key: 'step-description', color: 'yellow', marginTop: 1 }, 'Please select the correct file:'),
    React.createElement(Box, { key: 'step-options', marginTop: 2, flexDirection: 'column' },
      possibleFiles.map((file, index) => 
        React.createElement(Box, { key: `file-option-${index}`, flexDirection: 'row', marginBottom: 1 }, [
          React.createElement(Text, { 
            key: `file-indicator-${index}`, 
            color: selectedIndex === index ? 'green' : 'gray',
            marginRight: 1 
          }, selectedIndex === index ? '❯' : ' '),
          React.createElement(Text, { 
            key: `file-name-${index}`, 
            color: selectedIndex === index ? 'white' : 'gray',
            bold: selectedIndex === index
          }, file.file),
          React.createElement(Text, { 
            key: `file-confidence-${index}`, 
            color: 'gray',
            marginLeft: 2
          }, `(${Math.round(file.confidence * 100)}%)`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: 'gray', marginTop: 1 }, 'Use ↑↓ arrows to select, Enter to confirm'),
  ]);
}

module.exports = { FileSelectionStep };
