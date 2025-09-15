/**
 * Unified Ink setup wizard that preserves all steps without clearing
 * All steps are managed within a single component to avoid re-rendering
 */

/**
 * Render the setup wizard and return the project information
 */
async function showUnifiedSetupWizard(config) {
  try {
    // Dynamic import of Ink components
    const { Box, Text, render, useInput } = await import('ink');
    const React = await import('react');
    
    // Skip if non-interactive mode
    if (config.nonInteractive) {
      return {
        agentName: 'my-agent',
        entryFile: config.entryFile || 'index.js',
        entryFunction: config.entryFunction || 'main'
      };
    }

    return new Promise((resolve, reject) => {
      // Single component that manages all steps
      function UnifiedSetupWizard() {
        const [currentStep, setCurrentStep] = React.useState(1);
        const [projectInfo, setProjectInfo] = React.useState({});
        const [agentName, setAgentName] = React.useState('');
        const [entryFile, setEntryFile] = React.useState('');
        const [entryFunction, setEntryFunction] = React.useState('');
        const [cursorPosition, setCursorPosition] = React.useState(0);
        const [error, setError] = React.useState('');

        // Handle input based on current step
        useInput((input, key) => {
          // Handle Enter key
          if (key.return) {
            if (currentStep === 1) {
              // Validate agent name
              if (!agentName.trim()) {
                setError('Agent name cannot be empty');
                return;
              }
              if (!/^[a-zA-Z0-9-_]+$/.test(agentName)) {
                setError('Agent name can only contain letters, numbers, hyphens, and underscores');
                return;
              }
              setError('');
              setProjectInfo(prev => ({ ...prev, agentName }));
              setCurrentStep(2);
              setCursorPosition(0);
            } else if (currentStep === 2) {
              // Validate entry file
              if (!entryFile.trim()) {
                setError('File path cannot be empty');
                return;
              }
              setError('');
              setProjectInfo(prev => ({ ...prev, entryFile }));
              setCurrentStep(3);
              setCursorPosition(0);
            } else if (currentStep === 3) {
              // Validate entry function
              if (!entryFunction.trim()) {
                setError('Function name cannot be empty');
                return;
              }
              setError('');
              setProjectInfo(prev => ({ ...prev, entryFunction }));
              setCurrentStep(4); // Move to completion step
              
              // Auto-resolve after showing completion message
              setTimeout(() => {
                resolve({ ...projectInfo, entryFunction });
              }, 2000); // Show message for 2 seconds
            }
          }
          // Handle backspace
          else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            if (cursorPosition > 0) {
              if (currentStep === 1) {
                const newName = agentName.slice(0, cursorPosition - 1) + agentName.slice(cursorPosition);
                setAgentName(newName);
                setCursorPosition(cursorPosition - 1);
              } else if (currentStep === 2) {
                const newFile = entryFile.slice(0, cursorPosition - 1) + entryFile.slice(cursorPosition);
                setEntryFile(newFile);
                setCursorPosition(cursorPosition - 1);
              } else if (currentStep === 3) {
                const newFunc = entryFunction.slice(0, cursorPosition - 1) + entryFunction.slice(cursorPosition);
                setEntryFunction(newFunc);
                setCursorPosition(cursorPosition - 1);
              }
              setError(''); // Clear error when user starts typing
            }
          }
          // Handle arrow keys
          else if (key.leftArrow && cursorPosition > 0) {
            setCursorPosition(cursorPosition - 1);
          } else if (key.rightArrow) {
            const currentValue = currentStep === 1 ? agentName : currentStep === 2 ? entryFile : entryFunction;
            if (cursorPosition < currentValue.length) {
              setCursorPosition(cursorPosition + 1);
            }
          }
          // Handle Ctrl+C to cancel
          else if (key.ctrl && input === 'c') {
            reject(new Error('Setup cancelled by user'));
          }
          // Handle regular input
          else if (input && input.length === 1) {
            // Check if it's a printable character
            const charCode = input.charCodeAt(0);
            if (charCode >= 32 && charCode <= 126) { // Printable ASCII range
              if (currentStep === 1) {
                const newName = agentName.slice(0, cursorPosition) + input + agentName.slice(cursorPosition);
                setAgentName(newName);
                setCursorPosition(cursorPosition + 1);
              } else if (currentStep === 2) {
                const newFile = entryFile.slice(0, cursorPosition) + input + entryFile.slice(cursorPosition);
                setEntryFile(newFile);
                setCursorPosition(cursorPosition + 1);
              } else if (currentStep === 3) {
                const newFunc = entryFunction.slice(0, cursorPosition) + input + entryFunction.slice(cursorPosition);
                setEntryFunction(newFunc);
                setCursorPosition(cursorPosition + 1);
              }
              setError(''); // Clear error when user starts typing
            }
          }
        });

        // Get current input value and display
        const getCurrentValue = () => {
          if (currentStep === 1) return agentName;
          if (currentStep === 2) return entryFile;
          return entryFunction;
        };

        const displayValue = getCurrentValue() + (Date.now() % 1000 < 500 ? '_' : ''); // Blinking cursor

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Header (always visible)
          React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
            React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '🚀 Autonomous Engineer Setup'),
            React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Transform your AI agent into an autonomous engineer'),
            React.createElement(Text, { key: 'description', color: 'yellow' }, 'Configure monitoring, evaluation, and optimization for continuous improvement'),
          ]),
          
          // Step 1: Agent Name (always visible, highlighted when active)
          React.createElement(Box, { key: 'step1', flexDirection: 'column', marginBottom: 2 }, [
            React.createElement(Text, { 
              key: 'step1-title', 
              color: currentStep >= 1 ? 'yellow' : 'gray', 
              bold: currentStep === 1 
            }, '📝 Step 1: Agent Information'),
            
            currentStep >= 1 ? React.createElement(Box, { key: 'step1-content', flexDirection: 'column', marginLeft: 2 }, [
              React.createElement(Text, { key: 'step1-prompt', color: 'white' }, 'What would you like to name your agent? '),
              React.createElement(Text, { key: 'step1-default', color: 'gray' }, '[my-agent]'),
              
              currentStep === 1 ? React.createElement(Box, { key: 'step1-input', marginTop: 1 }, [
                React.createElement(Text, { key: 'step1-input-text', color: 'white', backgroundColor: 'blue' }, displayValue),
              ]) : React.createElement(Box, { key: 'step1-result', marginTop: 1 }, [
                React.createElement(Text, { key: 'step1-result-text', color: 'green', bold: true }, `✅ ${projectInfo.agentName}`),
              ]),
            ]) : null,
          ]),
          
          // Step 2: Entry File (visible from step 2, highlighted when active)
          currentStep >= 2 ? React.createElement(Box, { key: 'step2', flexDirection: 'column', marginBottom: 2 }, [
            React.createElement(Text, { 
              key: 'step2-title', 
              color: currentStep >= 2 ? 'yellow' : 'gray', 
              bold: currentStep === 2 
            }, '🎯 Step 2: Agent Entry Point'),
            
            currentStep >= 2 ? React.createElement(Box, { key: 'step2-content', flexDirection: 'column', marginLeft: 2 }, [
              React.createElement(Text, { key: 'step2-desc1', color: 'gray' }, 'Where does your agent start? This could be an endpoint handler, a main function, or any function that initiates your agent\'s execution.'),
              React.createElement(Text, { key: 'step2-desc2', color: 'gray' }, ''),
              React.createElement(Text, { key: 'step2-desc3', color: 'gray' }, 'Examples:'),
              React.createElement(Text, { key: 'step2-desc4', color: 'gray' }, '  • Express route handler: app.post("/chat", handleChat)'),
              React.createElement(Text, { key: 'step2-desc5', color: 'gray' }, '  • Main agent function: startAgent() or processRequest()'),
              React.createElement(Text, { key: 'step2-desc6', color: 'gray' }, '  • Webhook endpoint: handleWebhook() or processMessage()'),
              React.createElement(Text, { key: 'step2-desc7', color: 'gray' }, ''),
              
              React.createElement(Text, { key: 'step2-prompt', color: 'white' }, 'What is the path to the file containing your agent\'s entry function?'),
              
              currentStep === 2 ? React.createElement(Box, { key: 'step2-input', marginTop: 1 }, [
                React.createElement(Text, { key: 'step2-input-text', color: 'white', backgroundColor: 'blue' }, displayValue),
              ]) : React.createElement(Box, { key: 'step2-result', marginTop: 1 }, [
                React.createElement(Text, { key: 'step2-result-text', color: 'green', bold: true }, `✅ ${projectInfo.entryFile}`),
              ]),
            ]) : null,
          ]) : null,
          
          // Step 3: Entry Function (visible from step 3, highlighted when active)
          currentStep >= 3 ? React.createElement(Box, { key: 'step3', flexDirection: 'column', marginBottom: 2 }, [
            React.createElement(Text, { 
              key: 'step3-title', 
              color: currentStep >= 3 ? 'yellow' : 'gray', 
              bold: currentStep === 3 
            }, '⚡ Step 3: Entry Function'),
            
            currentStep >= 3 ? React.createElement(Box, { key: 'step3-content', flexDirection: 'column', marginLeft: 2 }, [
              React.createElement(Text, { key: 'step3-prompt', color: 'white' }, 'What is the name of the function or the endpoint that starts your agent?'),
              
              currentStep === 3 ? React.createElement(Box, { key: 'step3-input', marginTop: 1 }, [
                React.createElement(Text, { key: 'step3-input-text', color: 'white', backgroundColor: 'blue' }, displayValue),
              ]) : React.createElement(Box, { key: 'step3-result', marginTop: 1 }, [
                React.createElement(Text, { key: 'step3-result-text', color: 'green', bold: true }, `✅ ${projectInfo.entryFunction}`),
              ]),
            ]) : null,
          ]) : null,
          
          // Step 4: Completion/Processing (visible when all steps done)
          currentStep >= 4 ? React.createElement(Box, { key: 'step4', flexDirection: 'column', marginTop: 3 }, [
            React.createElement(Text, { key: 'step4-title', color: 'green', bold: true }, '✅ Setup Complete!'),
            React.createElement(Text, { key: 'step4-message', color: 'yellow' }, '🔍 Finding your entry point and setting up instrumentation...'),
            React.createElement(Text, { key: 'step4-details', color: 'gray', marginTop: 1 }, 'Please wait while we analyze your code and prepare the monitoring setup.'),
          ]) : null,
          
          // Error message (only show if there's an error)
          error ? React.createElement(Box, { key: 'error', marginTop: 2 }, [
            React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
          ]) : null,
          
          // Instructions (only show for input steps)
          currentStep < 4 ? React.createElement(Box, { key: 'instructions', marginTop: 3 }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 
              currentStep === 1 ? 'Enter agent name, then press Enter to continue' :
              currentStep === 2 ? 'Enter file path, then press Enter to continue' :
              'Enter function name, then press Enter to continue'
            ),
          ]) : null
        ]);
      }

      // Start the unified wizard - preserve existing output
      const { unmount } = render(React.createElement(UnifiedSetupWizard), {
        exitOnCtrlC: false,
        patchConsole: false, // Don't patch console to avoid clearing
        stdout: process.stdout,
        stdin: process.stdin
      });
    });
  } catch (error) {
    console.error('Error loading Ink:', error.message);
    console.log('Falling back to simple text-based setup...');
    
    // Fallback to simple text-based setup
    const inquirer = require('inquirer');
    const chalk = require('chalk');
    
    console.log(chalk.blue.bold('\n🤖 Agent Setup (Fallback Mode)'));
    console.log(chalk.gray('Let\'s configure your agent for Handit monitoring...\n'));

    // Agent name
    console.log(chalk.cyan.bold('📝 Step 1: Agent Information'));
    const { agentName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentName',
        message: 'What would you like to name your agent?',
        default: 'my-agent',
        validate: (input) => {
          if (!input.trim()) {
            return 'Agent name cannot be empty';
          }
          if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
            return 'Agent name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      }
    ]);

    // Entry file
    console.log(chalk.cyan.bold('\n🎯 Step 2: Agent Entry Point'));
    const { entryFile } = await inquirer.prompt([
      {
        type: 'input',
        name: 'entryFile',
        message: 'What is the path to the file containing your agent\'s entry function?',
        default: config.entryFile || 'index.js',
        validate: async (input) => {
          if (!input.trim()) {
            return 'File path cannot be empty';
          }
          return true;
        }
      }
    ]);

    // Entry function
    const { entryFunction } = await inquirer.prompt([
      {
        type: 'input',
        name: 'entryFunction',
        message: 'What is the name of the function or the endpoint that starts your agent?',
        default: config.entryFunction || 'main',
        validate: (input) => {
          if (!input.trim()) {
            return 'Function name cannot be empty';
          }
          return true;
        }
      }
    ]);

    return {
      agentName,
      entryFile,
      entryFunction
    };
  }
}

module.exports = { showUnifiedSetupWizard };
