/**
 * Ink-based file selection component
 * Replaces the inquirer list with beautiful Ink UI
 */

/**
 * Show file selection with Ink UI
 */
async function showInkFileSelection(files) {
  try {
    // Dynamic import of Ink components
    const { Box, Text, render, useInput } = await import('ink');
    const React = await import('react');
    
    return new Promise((resolve, reject) => {
      const [selectedIndex, setSelectedIndex] = React.useState(0);
      
      // File selection component
      function FileSelection({ files, onSelect, onCancel }) {
        useInput((input, key) => {
          if (key.upArrow) {
            setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : files.length - 1);
          } else if (key.downArrow) {
            setSelectedIndex(selectedIndex < files.length - 1 ? selectedIndex + 1 : 0);
          } else if (key.return) {
            onSelect(files[selectedIndex]);
          } else if (key.ctrl && input === 'c') {
            onCancel();
          }
        });

        const getFileIcon = (reason) => {
          if (reason.includes('Exact filename match')) return '🎯';
          if (reason.includes('Similar filename')) return '🔍';
          if (reason.includes('Directory match')) return '📁';
          if (reason.includes('Extension match')) return '📄';
          return '📝';
        };

        const getReasonColor = (reason) => {
          if (reason.includes('Exact filename match')) return 'green';
          if (reason.includes('Similar filename')) return 'yellow';
          if (reason.includes('Directory match')) return 'blue';
          if (reason.includes('Extension match')) return 'cyan';
          return 'gray';
        };

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Header
          React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
            React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '📁 File Selection'),
            React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Which file contains your agent\'s entry function?'),
          ]),
          
          // Files list
          React.createElement(Box, { key: 'files', flexDirection: 'column', marginBottom: 2 }, [
            files.map((file, index) => {
              const isSelected = index === selectedIndex;
              const fileIcon = getFileIcon(file.reason);
              const reasonColor = getReasonColor(file.reason);
              
              return React.createElement(Box, { key: `file-${index}`, marginBottom: 1 }, [
                React.createElement(Box, { key: `file-content-${index}`, flexDirection: 'row' }, [
                  React.createElement(Text, {
                    key: `selector-${index}`,
                    color: isSelected ? 'cyan' : 'gray',
                    backgroundColor: isSelected ? 'blue' : 'black',
                    bold: isSelected
                  }, isSelected ? '► ' : '  '),
                  
                  React.createElement(Text, { key: `icon-${index}`, marginRight: 1 }, fileIcon),
                  
                  React.createElement(Box, { key: `content-${index}`, flexDirection: 'column', flexGrow: 1 }, [
                    React.createElement(Text, { 
                      key: `name-${index}`,
                      color: isSelected ? 'white' : 'white',
                      bold: isSelected
                    }, file.file),
                    React.createElement(Text, { 
                      key: `reason-${index}`,
                      color: reasonColor,
                      dimColor: !isSelected
                    }, `(${file.reason})`)
                  ])
                ])
              ]);
            })
          ]),
          
          // Instructions
          React.createElement(Box, { key: 'instructions' }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 'Use ↑ ↓ arrows to navigate, Enter to select'),
          ])
        ]);
      }

      const { unmount } = render(
        React.createElement(FileSelection, {
          files: files,
          onSelect: (selectedFile) => {
            unmount();
            resolve(selectedFile);
          },
          onCancel: () => {
            unmount();
            reject(new Error('File selection cancelled'));
          }
        })
      );
    });
  } catch (error) {
    console.error('Error loading Ink for file selection:', error.message);
    // Fallback to original inquirer
    const inquirer = require('inquirer');
    
    const { fileChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileChoice',
        message: 'Which file contains your agent\'s entry function?',
        choices: files.map((file, index) => ({
          name: `${file.file} (${file.reason})`,
          value: index
        }))
      }
    ]);
    
    return files[fileChoice];
  }
}

module.exports = { showInkFileSelection };
