/**
 * Code Diff Viewer Component
 */
function CodeDiffViewer(React, Box, Text, { filePath, changes, onConfirm, onReject, selectedOption = 0 }) {
  const fileName = filePath?.split('/').pop();
  
  return React.createElement(Box, { key: 'diff-viewer', flexDirection: 'column', marginTop: 2 }, [
    // File title
    React.createElement(Box, { key: 'diff-title' }, 
      React.createElement(Text, { bold: true, color: 'cyan' }, filePath)
    ),
    
    // Outer box
    React.createElement(Box, { key: 'diff-outer-box', borderStyle: 'double', borderColor: 'white', padding: 1, marginTop: 1, flexDirection: 'column' }, [
      // Editing title (above everything, centered)
      React.createElement(Box, { key: 'diff-editing-title', marginBottom: 1, alignItems: 'center' },
        React.createElement(Text, { bold: true, color: 'yellow' }, `📝 Editing ${fileName}`)
      ),
      
      // Inner box with only the diff content
      React.createElement(Box, { key: 'diff-inner-box', borderStyle: 'single', borderColor: 'yellow', padding: 1, marginBottom: 2 }, [
        // Changes content
        React.createElement(Box, { key: 'diff-changes', flexDirection: 'column' },
          changes.slice(0, 10).map((change, index) => {
            const content = change.content || change.modifiedContent || '';
            const displayContent = content.trim() === '' ? '(empty line)' : content;
            
            return React.createElement(Box, { key: `diff-change-${index}`, flexDirection: 'row', marginBottom: 1 }, [
              React.createElement(Text, { color: 'gray', width: 5 }, `${change.line}:`),
              React.createElement(Text, { 
                backgroundColor: change.type === 'add' ? 'green' : change.type === 'remove' ? 'red' : 'blue',
                color: 'white', 
                marginLeft: 1,
                paddingX: 1
              }, `${change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~'} ${displayContent}`)
            ]);
          })
        )
      ]),
      
      // Confirmation prompt (below inner box, centered)
      React.createElement(Box, { key: 'diff-prompt', flexDirection: 'column', alignItems: 'center' }, [
        React.createElement(Text, { key: 'diff-question', color: 'yellow', marginBottom: 1 }, '❓ Do you want to make this edit to the file?'),
        React.createElement(Box, { key: 'diff-options', flexDirection: 'row', marginBottom: 1 }, [
          React.createElement(Box, { key: 'diff-yes', marginRight: 2 },
            React.createElement(Text, { 
              color: selectedOption === 0 ? 'green' : 'gray', 
              bold: selectedOption === 0, 
              backgroundColor: selectedOption === 0 ? 'green' : 'black', 
              paddingX: 1 
            }, '✓ Yes')
          ),
          React.createElement(Box, { key: 'diff-no' },
            React.createElement(Text, { 
              color: selectedOption === 1 ? 'red' : 'gray', 
              bold: selectedOption === 1, 
              backgroundColor: selectedOption === 1 ? 'red' : 'black', 
              paddingX: 1 
            }, '✗ No')
          )
        ]),
        React.createElement(Text, { key: 'diff-help', color: 'gray' }, 'Use ← → arrows to navigate, Y/N keys, or Enter to confirm')
      ])
    ]),
  ]);
}

module.exports = { CodeDiffViewer };
