/**
 * File Selection Step Component
 */
function FileSelectionStep(React, Box, Text, { possibleFiles, selectedIndex, onSelect }) {
  return React.createElement(Box, { key: 'step5-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: 'cyan', bold: true }, '📁 Select File'),
    React.createElement(Text, { key: 'step-description', color: 'yellow', marginTop: 1 }, 'Choose the correct file:'),
    React.createElement(Box, { key: 'step-options', marginTop: 2, flexDirection: 'column' },
      possibleFiles.map((file, index) => 
        React.createElement(Box, { 
          key: `file-option-${index}`, 
          flexDirection: 'row', 
          marginBottom: 1,
          borderStyle: selectedIndex === index ? 'single' : undefined,
          borderColor: selectedIndex === index ? 'cyan' : undefined,
          backgroundColor: selectedIndex === index ? 'black' : undefined
        }, [
          React.createElement(Text, { 
            key: `file-indicator-${index}`, 
            color: selectedIndex === index ? 'cyan' : 'gray',
            marginRight: 1 
          }, selectedIndex === index ? '❯' : ' '),
          React.createElement(Text, { 
            key: `file-name-${index}`, 
            color: selectedIndex === index ? 'white' : 'gray',
            bold: selectedIndex === index
          }, file.file),
          React.createElement(Text, { 
            key: `file-confidence-${index}`, 
            color: selectedIndex === index ? 'yellow' : 'gray',
            marginLeft: 2
          }, `(${Math.round(file.confidence * 100)}%)`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: 'gray', marginTop: 1 }, '↑↓ to select, Enter to confirm'),
  ]);
}

module.exports = { FileSelectionStep };
