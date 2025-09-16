/**
 * Ink-based setup wizard using dynamic imports for ES module compatibility
 */

/**
 * Render the setup wizard and return the project information
 */
async function showSetupWizard(config) {
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
      let currentStep = 1;
      let projectInfo = {};

      // Step 1: Agent Name Input
      function AgentNameStep({ onComplete, onBack }) {
        const [agentName, setAgentName] = React.useState('');
        const [cursorPosition, setCursorPosition] = React.useState(0);
        const [error, setError] = React.useState('');

        useInput((input, key) => {
          // Handle Enter key
          if (key.return) {
            // Validate and submit
            if (!agentName.trim()) {
              setError('Agent name cannot be empty');
              return;
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(agentName)) {
              setError('Agent name can only contain letters, numbers, hyphens, and underscores');
              return;
            }
            setError('');
            onComplete({ agentName });
          }
          // Handle backspace - Ink sends key.delete for backspace
          else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            if (cursorPosition > 0) {
              const newName = agentName.slice(0, cursorPosition - 1) + agentName.slice(cursorPosition);
              setAgentName(newName);
              setCursorPosition(cursorPosition - 1);
              setError(''); // Clear error when user starts typing
            }
          }
          // Handle arrow keys
          else if (key.leftArrow && cursorPosition > 0) {
            setCursorPosition(cursorPosition - 1);
          } else if (key.rightArrow && cursorPosition < agentName.length) {
            setCursorPosition(cursorPosition + 1);
          }
          // Handle Ctrl+C to cancel
          else if (key.ctrl && input === 'c') {
            onBack();
          }
          // Handle regular input - be more permissive
          else if (input && input.length === 1) {
            // Check if it's a printable character
            const charCode = input.charCodeAt(0);
            if (charCode >= 32 && charCode <= 126) { // Printable ASCII range
              const newName = agentName.slice(0, cursorPosition) + input + agentName.slice(cursorPosition);
              setAgentName(newName);
              setCursorPosition(cursorPosition + 1);
              setError(''); // Clear error when user starts typing
            }
          }
        });

        const displayName = agentName + (Date.now() % 1000 < 500 ? '_' : ''); // Blinking cursor

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Header
          React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }, [
            React.createElement(Text, { key: 'title', color: 'cyan', bold: true }, '🚀 Autonomous Engineer Setup'),
            React.createElement(Text, { key: 'subtitle', color: 'white', bold: true }, 'Add Handit monitoring, evaluation, and optimization to your AI agent'),
            React.createElement(Text, { key: 'description', color: '#c8c8c84d' }, 'Configure monitoring, evaluation, and optimization for continuous improvement'),
          ]),
          
          // Step indicator
          React.createElement(Box, { key: 'step', marginBottom: 2 }, [
            React.createElement(Text, { key: 'step-text', color: '#71f2af', bold: true }, '📝 Step 1: Agent Information'),
          ]),
          
          // Input prompt
          React.createElement(Box, { key: 'prompt', marginBottom: 1 }, [
            React.createElement(Text, { key: 'prompt-text', color: 'white' }, 'What would you like to name your agent? '),
            React.createElement(Text, { key: 'default-text', color: 'gray' }, '[my-agent]'),
          ]),
          
          // Input field with cursor
          React.createElement(Box, { key: 'input', marginBottom: 1 }, [
            React.createElement(Text, { key: 'input-text', color: 'white', backgroundColor: 'blue' }, displayName),
          ]),
          
          // Error message
          error ? React.createElement(Box, { key: 'error', marginBottom: 1 }, [
            React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
          ]) : null,
          
          // Instructions
          React.createElement(Box, { key: 'instructions', marginTop: 2 }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 'Enter agent name, then press Enter to continue'),
          ])
        ]);
      }

      // Step 2: Entry File Input
      function EntryFileStep({ onComplete, onBack, defaultFile = 'index.js' }) {
        const [entryFile, setEntryFile] = React.useState('');
        const [cursorPosition, setCursorPosition] = React.useState(0);
        const [error, setError] = React.useState('');

        useInput((input, key) => {
          // Handle Enter key
          if (key.return) {
            if (!entryFile.trim()) {
              setError('File path cannot be empty');
              return;
            }
            setError('');
            onComplete({ entryFile });
          }
          // Handle backspace - Ink sends key.delete for backspace
          else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            if (cursorPosition > 0) {
              const newFile = entryFile.slice(0, cursorPosition - 1) + entryFile.slice(cursorPosition);
              setEntryFile(newFile);
              setCursorPosition(cursorPosition - 1);
              setError(''); // Clear error when user starts typing
            }
          }
          // Handle arrow keys
          else if (key.leftArrow && cursorPosition > 0) {
            setCursorPosition(cursorPosition - 1);
          } else if (key.rightArrow && cursorPosition < entryFile.length) {
            setCursorPosition(cursorPosition + 1);
          }
          // Handle Ctrl+C to cancel
          else if (key.ctrl && input === 'c') {
            onBack();
          }
          // Handle regular input
          else if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt && input !== '\u007f' && input !== '\b') {
            // Only accept printable characters
            const newFile = entryFile.slice(0, cursorPosition) + input + entryFile.slice(cursorPosition);
            setEntryFile(newFile);
            setCursorPosition(cursorPosition + 1);
            setError(''); // Clear error when user starts typing
          }
        });

        const displayFile = entryFile + (Date.now() % 1000 < 500 ? '_' : ''); // Blinking cursor

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Step indicator
          React.createElement(Box, { key: 'step', marginBottom: 2 }, [
            React.createElement(Text, { key: 'step-text', color: '#71f2af', bold: true }, '⚡ Step 2: Engine Entry Point'),
          ]),
          
          // Description
          React.createElement(Box, { key: 'description', flexDirection: 'column', marginBottom: 2 }, [
            React.createElement(Text, { key: 'desc1', color: 'gray' }, 'Where does your agent start? This could be an endpoint handler, a main function, or any function that initiates your agent\'s execution.'),
            React.createElement(Text, { key: 'desc2', color: 'gray' }, ''),
            React.createElement(Text, { key: 'desc3', color: 'gray' }, 'Examples:'),
            React.createElement(Text, { key: 'desc4', color: 'gray' }, '  • Express route handler: app.post("/chat", handleChat)'),
            React.createElement(Text, { key: 'desc5', color: 'gray' }, '  • Main agent function: startAgent() or processRequest()'),
            React.createElement(Text, { key: 'desc6', color: 'gray' }, '  • Webhook endpoint: handleWebhook() or processMessage()'),
          ]),
          
          // Input prompt
          React.createElement(Box, { key: 'prompt', marginBottom: 1 }, [
            React.createElement(Text, { key: 'prompt-text', color: 'white' }, 'What is the path to the file containing your agent\'s entry function?'),
          ]),
          
          // Input field
          React.createElement(Box, { key: 'input', marginBottom: 1 }, [
            React.createElement(Text, { key: 'input-text', color: 'white', backgroundColor: 'blue' }, displayFile),
          ]),
          
          // Error message
          error ? React.createElement(Box, { key: 'error', marginBottom: 1 }, [
            React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
          ]) : null,
          
          // Instructions
          React.createElement(Box, { key: 'instructions', marginTop: 2 }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 'Enter file path, then press Enter to continue'),
          ])
        ]);
      }

      // Step 3: Entry Function Input
      function EntryFunctionStep({ onComplete, onBack, defaultFunction = 'main' }) {
        const [entryFunction, setEntryFunction] = React.useState('');
        const [cursorPosition, setCursorPosition] = React.useState(0);
        const [error, setError] = React.useState('');

        useInput((input, key) => {
          // Handle Enter key
          if (key.return) {
            if (!entryFunction.trim()) {
              setError('Function name cannot be empty');
              return;
            }
            setError('');
            onComplete({ entryFunction });
          }
          // Handle backspace - Ink sends key.delete for backspace
          else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            if (cursorPosition > 0) {
              const newFunc = entryFunction.slice(0, cursorPosition - 1) + entryFunction.slice(cursorPosition);
              setEntryFunction(newFunc);
              setCursorPosition(cursorPosition - 1);
              setError(''); // Clear error when user starts typing
            }
          }
          // Handle arrow keys
          else if (key.leftArrow && cursorPosition > 0) {
            setCursorPosition(cursorPosition - 1);
          } else if (key.rightArrow && cursorPosition < entryFunction.length) {
            setCursorPosition(cursorPosition + 1);
          }
          // Handle Ctrl+C to cancel
          else if (key.ctrl && input === 'c') {
            onBack();
          }
          // Handle regular input
          else if (input && input.length === 1 && !key.ctrl && !key.meta && !key.alt && input !== '\u007f' && input !== '\b') {
            // Only accept printable characters
            const newFunc = entryFunction.slice(0, cursorPosition) + input + entryFunction.slice(cursorPosition);
            setEntryFunction(newFunc);
            setCursorPosition(cursorPosition + 1);
            setError(''); // Clear error when user starts typing
          }
        });

        const displayFunction = entryFunction + (Date.now() % 1000 < 500 ? '_' : ''); // Blinking cursor

        return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
          // Input prompt
          React.createElement(Box, { key: 'prompt', marginBottom: 1 }, [
            React.createElement(Text, { key: 'prompt-text', color: 'white' }, 'What is the name of the function or the endpoint that starts your agent?'),
          ]),
          
          // Input field
          React.createElement(Box, { key: 'input', marginBottom: 1 }, [
            React.createElement(Text, { key: 'input-text', color: 'white', backgroundColor: 'blue' }, displayFunction),
          ]),
          
          // Error message
          error ? React.createElement(Box, { key: 'error', marginBottom: 1 }, [
            React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
          ]) : null,
          
          // Instructions
          React.createElement(Box, { key: 'instructions', marginTop: 2 }, [
            React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 'Enter function name, then press Enter to continue'),
          ])
        ]);
      }

      // Main setup wizard component
      function SetupWizard() {
        const handleStepComplete = (stepData) => {
          projectInfo = { ...projectInfo, ...stepData };
          
          if (currentStep === 1) {
            currentStep = 2;
            // Re-render with step 2
            const { unmount } = render(React.createElement(EntryFileStep, {
              onComplete: handleStepComplete,
              onBack: handleBack,
              defaultFile: config.entryFile || 'index.js'
            }), {
              exitOnCtrlC: false,
              patchConsole: false,
              stdout: process.stdout,
              stdin: process.stdin
            });
          } else if (currentStep === 2) {
            currentStep = 3;
            // Re-render with step 3
            const { unmount } = render(React.createElement(EntryFunctionStep, {
              onComplete: handleStepComplete,
              onBack: handleBack,
              defaultFunction: config.entryFunction || 'main'
            }), {
              exitOnCtrlC: false,
              patchConsole: false,
              stdout: process.stdout,
              stdin: process.stdin
            });
          } else if (currentStep === 3) {
            // All steps complete
            resolve(projectInfo);
          }
        };

        const handleBack = () => {
          if (currentStep > 1) {
            currentStep--;
            // Re-render with previous step
            if (currentStep === 1) {
              const { unmount } = render(React.createElement(AgentNameStep, {
                onComplete: handleStepComplete,
                onBack: handleBack
              }), {
                exitOnCtrlC: false,
                patchConsole: false,
                stdout: process.stdout,
                stdin: process.stdin
              });
            } else if (currentStep === 2) {
              const { unmount } = render(React.createElement(EntryFileStep, {
                onComplete: handleStepComplete,
                onBack: handleBack,
                defaultFile: config.entryFile || 'index.js'
              }), {
                exitOnCtrlC: false,
                patchConsole: false,
                stdout: process.stdout,
                stdin: process.stdin
              });
            }
          } else {
            reject(new Error('Setup cancelled by user'));
          }
        };

        return React.createElement(AgentNameStep, {
          onComplete: handleStepComplete,
          onBack: handleBack
        });
      }

      // Start with step 1 - preserve existing output
      const { unmount } = render(React.createElement(SetupWizard), {
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

module.exports = { showSetupWizard };