/**
 * Code Diff Viewer Component with Context
 */
function CodeDiffViewer(React, Box, Text, { filePath, changes, originalFileContent, onConfirm, onReject, selectedOption = 0 }) {
  const fileName = filePath?.split('/').pop();
  
  // Group changes by proximity to avoid overlaps
  const groupChangesByProximity = (changes) => {
    if (!changes || changes.length === 0) return [];
    
    const groups = [];
    let currentGroup = {
      changes: [changes[0]],
      startLine: changes[0].line,
      endLine: changes[0].line
    };
    
    for (let i = 1; i < changes.length; i++) {
      const change = changes[i];
      const lastChange = currentGroup.changes[currentGroup.changes.length - 1];
      
      // If changes are close together (within 5 lines), group them
      if (change.line - lastChange.line <= 5) {
        currentGroup.changes.push(change);
        currentGroup.endLine = change.line;
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = {
          changes: [change],
          startLine: change.line,
          endLine: change.line
        };
      }
    }
    
    groups.push(currentGroup);
    return groups;
  };

  // Generate diff content with context
  const generateDiffContent = () => {
    if (!changes || !originalFileContent) return [];
    
    const changeGroups = groupChangesByProximity(changes);
    const diffLines = [];
    
    changeGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        diffLines.push({
          type: 'separator',
          content: '   ...',
          line: null
        });
      }
      
      const startLine = Math.max(1, group.startLine - 2);
      const endLine = Math.min(originalFileContent.length, group.endLine + 2);
      
      // Show context before changes
      for (let i = startLine; i < group.startLine; i++) {
        const lineContent = originalFileContent[i - 1] || '';
        diffLines.push({
          type: 'context',
          content: lineContent,
          line: i
        });
      }
      
      // Show changes
      group.changes.forEach(change => {
        const content = change.content || change.modifiedContent || '';
        const displayContent = content.trim() === '' ? '' : content;
        
        if (change.type === 'add') {
          diffLines.push({
            type: 'add',
            content: displayContent,
            line: change.line
          });
        } else if (change.type === 'remove') {
          diffLines.push({
            type: 'remove',
            content: displayContent,
            line: change.line
          });
        } else if (change.type === 'modify') {
          diffLines.push({
            type: 'remove',
            content: change.content || '(empty line)',
            line: change.line
          });
          diffLines.push({
            type: 'add',
            content: change.modifiedContent || '(empty line)',
            line: change.line
          });
        }
      });
      
      // Show context after changes
      for (let i = group.endLine + 1; i <= endLine; i++) {
        const lineContent = originalFileContent[i - 1] || '';
        diffLines.push({
          type: 'context',
          content: lineContent,
          line: i
        });
      }
    });
    
    return diffLines.slice(0, 20); // Limit to 20 lines for display
  };

  const diffLines = generateDiffContent();
  
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
        // Changes content with context
        React.createElement(Box, { key: 'diff-changes', flexDirection: 'column' },
          diffLines.map((diffLine, index) => {
            if (diffLine.type === 'separator') {
              return React.createElement(Box, { key: `diff-separator-${index}` },
                React.createElement(Text, { color: 'gray' }, diffLine.content)
              );
            }
            
            const lineNum = diffLine.line ? `${diffLine.line.toString().padStart(3)}:` : '    ';
            const symbol = diffLine.type === 'add' ? '+' : diffLine.type === 'remove' ? '-' : ' ';
            const bgColor = diffLine.type === 'add' ? 'green' : diffLine.type === 'remove' ? 'red' : 'transparent';
            const textColor = diffLine.type === 'context' ? 'gray' : 'white';
            
            return React.createElement(Box, { key: `diff-line-${index}`, flexDirection: 'row' }, [
              React.createElement(Text, { color: 'gray', width: 6 }, lineNum),
              React.createElement(Text, { 
                backgroundColor: bgColor,
                color: textColor, 
                marginLeft: 1,
                paddingX: diffLine.type !== 'context' ? 1 : 0
              }, `${symbol} ${diffLine.content}`)
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
