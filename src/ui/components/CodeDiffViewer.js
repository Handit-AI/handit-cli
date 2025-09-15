/**
 * Code Diff Viewer Component
 */
function CodeDiffViewer(React, Box, Text, { filePath, changes, onConfirm, onReject }) {
  const fileName = filePath?.split('/').pop();
  
  return React.createElement(Box, { key: 'diff-viewer', flexDirection: 'column', marginTop: 2 }, [
    // File title
    React.createElement(Box, { key: 'diff-title' }, 
      React.createElement(Text, { bold: true, color: 'cyan' }, filePath)
    ),
    
    // Outer box
    React.createElement(Box, { key: 'diff-outer-box', borderStyle: 'double', borderColor: 'white', padding: 1, marginTop: 1 }, [
      // Inner box with title
      React.createElement(Box, { key: 'diff-inner-box', flexDirection: 'column' }, [
        React.createElement(Box, { key: 'diff-inner-title', borderStyle: 'single', borderColor: 'yellow', padding: 1 },
          React.createElement(Text, { bold: true, color: 'yellow' }, `📝 Editing ${fileName}`)
        ),
        
        // Changes content
        React.createElement(Box, { key: 'diff-changes', flexDirection: 'column', marginTop: 1 },
          changes.slice(0, 10).map((change, index) => 
            React.createElement(Box, { key: `diff-change-${index}`, flexDirection: 'row' }, [
              React.createElement(Text, { color: 'gray', width: 5 }, `${index + 1}:`),
              React.createElement(Text, { 
                backgroundColor: change.type === 'add' ? 'green' : change.type === 'remove' ? 'red' : 'blue',
                color: 'white', 
                marginLeft: 1 
              }, `${change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~'} ${change.content || change.modifiedContent}`)
            ])
          )
        )
      ])
    ]),
    
    // Confirmation prompt
    React.createElement(Box, { key: 'diff-prompt', marginTop: 2, flexDirection: 'column' }, [
      React.createElement(Text, { key: 'diff-question', color: 'yellow' }, '❓ Do you want to make this edit to the file?'),
      React.createElement(Box, { key: 'diff-options', marginTop: 1, flexDirection: 'row' }, [
        React.createElement(Box, { key: 'diff-yes', marginRight: 2 },
          React.createElement(Text, { color: 'green', bold: true, backgroundColor: 'green', paddingX: 1 }, '✓ Yes')
        ),
        React.createElement(Box, { key: 'diff-no' },
          React.createElement(Text, { color: 'red', bold: true, backgroundColor: 'red', paddingX: 1 }, '✗ No')
        )
      ]),
      React.createElement(Text, { key: 'diff-help', color: 'gray', marginTop: 1 }, 'Press Y for Yes, N for No, or Enter to confirm')
    ]),
  ]);
}

module.exports = { CodeDiffViewer };
