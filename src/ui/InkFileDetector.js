/**
 * Ink-based file and function detection components
 * Integrates with the unified setup wizard for seamless experience
 */

/**
 * Show file detection and selection using Ink
 */
async function showInkFileDetection(userFileInput, userFunctionInput, projectRoot) {
  try {
    // Dynamic import of Ink components
    const { Box, Text, render, useInput } = await import('ink');
    const React = await import('react');
    
    // Import the detection logic
    const { 
      preprocessUserFileInput, 
      getAllFiles, 
      findPossibleFiles, 
      findFunctionInFile 
    } = require('../utils/fileDetector');

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let currentStep = 1;
      let possibleFiles = [];
      let selectedFile = null;
      let fileAnalysis = null;
      let selectedFunction = null;

      // Step 1: File Detection
      function FileDetectionStep({ onComplete, onError }) {
        const [status, setStatus] = React.useState('🔍 Analyzing your project...');
        const [progress, setProgress] = React.useState(0);

        React.useEffect(() => {
          async function detectFiles() {
            try {
              setStatus('🔍 Analyzing your project...');
              setProgress(10);
              
              // Step 1: Preprocess user file input
              const processedFileInput = preprocessUserFileInput(userFileInput, projectRoot);
              setProgress(30);
              
              setStatus('📁 Scanning project files...');
              // Step 2: Get all files in project
              const allFiles = await getAllFiles(projectRoot);
              setProgress(60);
              
              setStatus('🤖 Using AI to find matching files...');
              // Step 3: Find possible files
              possibleFiles = await findPossibleFiles(processedFileInput, allFiles);
              setProgress(100);
              
              if (possibleFiles.length === 0) {
                onError(`No files found matching "${processedFileInput}". Please check the file path.`);
                return;
              }
              
              if (possibleFiles.length === 1) {
                selectedFile = possibleFiles[0];
                setStatus('✅ File found! Analyzing functions...');
                // Auto-proceed to function detection
                setTimeout(() => {
                  currentStep = 2;
                  onComplete();
                }, 1000);
              } else {
                setStatus('📋 Multiple files found. Please select one...');
                currentStep = 1.5; // File selection step
                setTimeout(() => {
                  onComplete();
                }, 1000);
              }
            } catch (error) {
              onError(error.message);
            }
          }
          
          detectFiles();
        }, []);

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '🔍 Smart File Detection'),
          React.createElement(Text, { key: 'subtitle', color: 'gray' }, 'Using AI to find the correct file and function...'),
          React.createElement(Box, { key: 'progress', marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'status', color: '#71f2af' }, status),
            React.createElement(Box, { key: 'bar', marginTop: 1, width: 40 }, [
              React.createElement(Text, { key: 'bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor(progress / 2.5))),
              React.createElement(Text, { key: 'bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor(progress / 2.5))),
            ]),
          ]),
        ]);
      }

      // Step 1.5: File Selection
      function FileSelectionStep({ onComplete }) {
        const [selectedIndex, setSelectedIndex] = React.useState(0);

        useInput((input, key) => {
          if (key.return) {
            selectedFile = possibleFiles[selectedIndex];
            currentStep = 2;
            onComplete();
          } else if (key.upArrow && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
          } else if (key.downArrow && selectedIndex < possibleFiles.length - 1) {
            setSelectedIndex(selectedIndex + 1);
          } else if (key.ctrl && input === 'c') {
            reject(new Error('Setup cancelled by user'));
          }
        });

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          React.createElement(Text, { key: 'title', color: '#71f2af', bold: true }, `Found ${possibleFiles.length} possible files:`),
          React.createElement(Box, { key: 'files', flexDirection: 'column', marginTop: 1 }, 
            possibleFiles.map((file, index) => 
              React.createElement(Box, { key: `file-${index}`, flexDirection: 'row' }, [
                React.createElement(Text, { key: `indicator-${index}`, color: index === selectedIndex ? 'cyan' : 'gray' }, 
                  index === selectedIndex ? '❯ ' : '  '
                ),
                React.createElement(Text, { 
                  key: `name-${index}`, 
                  color: index === selectedIndex ? 'cyan' : 'white' 
                }, `${index + 1}. ${file.file} (${file.reason})`),
              ])
            )
          ),
          React.createElement(Text, { key: 'instructions', color: '#71f2af', marginTop: 2, bold: true }, 
            '💡 Use ↑↓ arrows to navigate, Enter to select'
          ),
        ]);
      }

      // Step 2: Function Detection
      function FunctionDetectionStep({ onComplete, onError }) {
        const [status, setStatus] = React.useState('🔍 Analyzing functions in file...');
        const [progress, setProgress] = React.useState(0);

        React.useEffect(() => {
          async function detectFunctions() {
            try {
              setProgress(20);
              fileAnalysis = await findFunctionInFile(userFunctionInput, selectedFile.file, projectRoot);
              setProgress(100);
              
              if (fileAnalysis.functions.length === 0) {
                onError(`No functions or endpoints found in ${selectedFile.file}. Please check the function name or endpoint path.`);
                return;
              }
              
              if (fileAnalysis.functions.length === 1) {
                selectedFunction = fileAnalysis.functions[0];
                setStatus('✅ Function found!');
                currentStep = 3;
                setTimeout(() => {
                  onComplete();
                }, 1000);
              } else {
                setStatus('📋 Multiple functions found. Please select one...');
                currentStep = 2.5; // Function selection step
                setTimeout(() => {
                  onComplete();
                }, 1000);
              }
            } catch (error) {
              onError(error.message);
            }
          }
          
          detectFunctions();
        }, []);

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, `🔍 Function Detection in ${selectedFile.file}`),
          React.createElement(Box, { key: 'progress', marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'status', color: '#71f2af' }, status),
            React.createElement(Box, { key: 'bar', marginTop: 1, width: 40 }, [
              React.createElement(Text, { key: 'bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor(progress / 2.5))),
              React.createElement(Text, { key: 'bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor(progress / 2.5))),
            ]),
          ]),
        ]);
      }

      // Step 2.5: Function Selection
      function FunctionSelectionStep({ onComplete }) {
        const [selectedIndex, setSelectedIndex] = React.useState(0);

        useInput((input, key) => {
          if (key.return) {
            selectedFunction = fileAnalysis.functions[selectedIndex];
            currentStep = 3;
            onComplete();
          } else if (key.upArrow && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
          } else if (key.downArrow && selectedIndex < fileAnalysis.functions.length - 1) {
            setSelectedIndex(selectedIndex + 1);
          } else if (key.ctrl && input === 'c') {
            reject(new Error('Setup cancelled by user'));
          }
        });

        const getTypeIcon = (type) => {
          return type === 'endpoint' ? '🌐' : 
                 type === 'method' ? '🔧' : 
                 type === 'handler' ? '📡' : '⚙️';
        };

        const getConfidenceColor = (confidence) => {
          return confidence >= 0.9 ? 'green' : 
                 confidence >= 0.7 ? 'yellow' : 
                 confidence >= 0.5 ? 'blue' : 'gray';
        };

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          React.createElement(Text, { key: 'title', color: '#71f2af', bold: true }, 
            `Found ${fileAnalysis.functions.length} possible functions/endpoints in ${selectedFile.file}:`
          ),
          React.createElement(Box, { key: 'functions', flexDirection: 'column', marginTop: 1 }, 
            fileAnalysis.functions.map((func, index) => 
              React.createElement(Box, { key: `func-${index}`, flexDirection: 'row', marginBottom: 1 }, [
                React.createElement(Text, { key: `indicator-${index}`, color: index === selectedIndex ? 'cyan' : 'gray' }, 
                  index === selectedIndex ? '❯ ' : '  '
                ),
                React.createElement(Text, { key: `icon-${index}`, color: 'white' }, getTypeIcon(func.type)),
                React.createElement(Text, { key: `name-${index}`, color: getConfidenceColor(func.confidence) }, ` ${func.name} (line ${func.line})`),
                React.createElement(Text, { key: `code-${index}`, color: 'gray' }, ` - ${func.lineContent}`),
              ])
            )
          ),
          React.createElement(Text, { key: 'instructions', color: '#71f2af', marginTop: 2, bold: true }, 
            '💡 Use ↑↓ arrows to navigate, Enter to select'
          ),
        ]);
      }

      // Step 3: Confirmation
      function ConfirmationStep({ onComplete }) {
        React.useEffect(() => {
          // Auto-complete after showing confirmation
          setTimeout(() => {
            onComplete();
          }, 2000);
        }, []);

        const typeIcon = selectedFunction.type === 'endpoint' ? '🌐' : 
                        selectedFunction.type === 'method' ? '🔧' : 
                        selectedFunction.type === 'handler' ? '📡' : '⚙️';

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          React.createElement(Text, { key: 'title', color: 'green', bold: true }, '✅ File and Function Detected'),
          React.createElement(Text, { key: 'subtitle', color: 'gray' }, 'Please confirm the detected entry point:'),
          React.createElement(Box, { key: 'details', flexDirection: 'column', marginTop: 2 }, [
            React.createElement(Text, { key: 'file', color: 'white' }, `  File: ${selectedFile.file}`),
            React.createElement(Text, { key: 'type', color: 'white' }, `  Type: ${typeIcon} ${selectedFunction.type || 'function'}`),
            React.createElement(Text, { key: 'name', color: 'white' }, `  Name: ${selectedFunction.name}`),
            React.createElement(Text, { key: 'line', color: 'white' }, `  Line: ${selectedFunction.line}`),
            React.createElement(Text, { key: 'code', color: 'gray' }, `  Code: ${selectedFunction.lineContent}`),
          ]),
        ]);
      }

      // Main component that manages all steps
      function FileDetectionWizard() {
        const [currentComponent, setCurrentComponent] = React.useState('detection');
        const [error, setError] = React.useState('');

        const handleStepComplete = () => {
          if (currentStep === 1.5) {
            setCurrentComponent('selection');
          } else if (currentStep === 2) {
            setCurrentComponent('function');
          } else if (currentStep === 2.5) {
            setCurrentComponent('function-selection');
          } else if (currentStep === 3) {
            setCurrentComponent('confirmation');
          }
        };

        const handleError = (errorMessage) => {
          setError(errorMessage);
        };

        const handleConfirmationComplete = () => {
          resolve({
            file: selectedFile.file,
            function: selectedFunction.name,
            line: selectedFunction.line
          });
        };

        if (error) {
          return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
            React.createElement(Text, { key: 'error', color: 'red' }, `❌ ${error}`),
          ]);
        }

        switch (currentComponent) {
          case 'detection':
            return React.createElement(FileDetectionStep, { 
              key: 'detection',
              onComplete: handleStepComplete, 
              onError: handleError 
            });
          case 'selection':
            return React.createElement(FileSelectionStep, { 
              key: 'selection',
              onComplete: handleStepComplete 
            });
          case 'function':
            return React.createElement(FunctionDetectionStep, { 
              key: 'function',
              onComplete: handleStepComplete, 
              onError: handleError 
            });
          case 'function-selection':
            return React.createElement(FunctionSelectionStep, { 
              key: 'function-selection',
              onComplete: handleStepComplete 
            });
          case 'confirmation':
            return React.createElement(ConfirmationStep, { 
              key: 'confirmation',
              onComplete: handleConfirmationComplete 
            });
          default:
            return React.createElement(Text, { key: 'default', color: 'red' }, 'Unknown step');
        }
      }

      // Start the file detection wizard
      const { unmount } = render(React.createElement(FileDetectionWizard), {
        exitOnCtrlC: false,
        patchConsole: false,
        stdout: process.stdout,
        stdin: process.stdin
      });
    });
  } catch (error) {
    console.error('Error loading Ink file detection:', error.message);
    console.log('Falling back to console-based file detection...');
    
    // Fallback to original file detection
    const { detectFileAndFunction } = require('../utils/fileDetector');
    return await detectFileAndFunction(userFileInput, userFunctionInput, projectRoot);
  }
}

module.exports = { showInkFileDetection };
