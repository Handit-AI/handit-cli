/**
 * File Selection Step Component
 */
function FileSelectionStep(React, Box, Text, { possibleFiles, selectedIndex, onSelect }) {
  return React.createElement(Box, { key: 'step5-5', flexDirection: 'column', marginTop: 2 }, [
    React.createElement(Text, { key: 'step-title', color: '#71f2af', bold: true }, '📁 Select File'),
    React.createElement(Text, { key: 'step-description', color: '#c8c8c84d', marginTop: 1 }, 'Choose the correct file:'),
    React.createElement(Box, { key: 'step-options', marginTop: 2, flexDirection: 'column' },
      possibleFiles.map((file, index) => 
        React.createElement(Box, { 
          key: `file-option-${index}`, 
          flexDirection: 'row', 
          marginBottom: 1,
          borderStyle: selectedIndex === index ? 'single' : undefined,
          borderColor: selectedIndex === index ? '#71f2af' : undefined,
          backgroundColor: selectedIndex === index ? '#0c272e' : undefined,
          paddingX: selectedIndex === index ? 1 : 0,
          paddingY: selectedIndex === index ? 0.5 : 0
        }, [
          React.createElement(Text, { 
            key: `file-indicator-${index}`, 
            color: selectedIndex === index ? '#71f2af' : '#c8c8c84d',
            marginRight: 1,
            bold: selectedIndex === index
          }, selectedIndex === index ? '►' : ' '),
          React.createElement(Text, { 
            key: `file-name-${index}`, 
            color: selectedIndex === index ? 'white' : 'gray',
            bold: selectedIndex === index
          }, file.file),
          React.createElement(Text, { 
            key: `file-confidence-${index}`, 
            color: selectedIndex === index ? '#71f2af' : '#c8c8c84d',
            marginLeft: 2
          }, `(${Math.round(file.confidence * 100)}%)`),
        ])
      )
    ),
    React.createElement(Text, { key: 'step-help', color: '#71f2af', marginTop: 1 }, '💡 Use ↑↓ arrows to navigate, Enter to select'),
  ]);
}

module.exports = { FileSelectionStep };
