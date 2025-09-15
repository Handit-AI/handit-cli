/**
 * Console-based setup with Ink-like styling
 * Uses regular console output to avoid clearing the terminal
 */

const chalk = require('chalk');
const readline = require('readline');

/**
 * Show setup wizard using console output (no clearing)
 */
async function showConsoleInkSetup(config) {
  // Skip if non-interactive mode
  if (config.nonInteractive) {
    return {
      agentName: 'my-agent',
      entryFile: config.entryFile || 'index.js',
      entryFunction: config.entryFunction || 'main'
    };
  }

  console.log('');
  console.log(chalk.cyan.bold('🚀 Autonomous Engineer Setup'));
  console.log(chalk.white.bold('Transform your AI agent into an autonomous engineer'));
  console.log(chalk.yellow('Configure monitoring, evaluation, and optimization for continuous improvement'));
  console.log('');

  // Step 1: Agent Name
  console.log(chalk.yellow.bold('📝 Step 1: Agent Information'));
  
  const agentName = await promptInput('What would you like to name your agent? ', {
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
  });

  // Step 2: Entry File
  console.log('');
  console.log(chalk.yellow.bold('🎯 Step 2: Agent Entry Point'));
  console.log(chalk.gray('Where does your agent start? This could be an endpoint handler, a main function, or any function that initiates your agent\'s execution.'));
  console.log(chalk.gray(''));
  console.log(chalk.gray('Examples:'));
  console.log(chalk.gray('  • Express route handler: app.post("/chat", handleChat)'));
  console.log(chalk.gray('  • Main agent function: startAgent() or processRequest()'));
  console.log(chalk.gray('  • Webhook endpoint: handleWebhook() or processMessage()'));
  console.log('');
  
  const entryFile = await promptInput('What is the path to the file containing your agent\'s entry function? ', {
    default: config.entryFile || 'index.js',
    validate: (input) => {
      if (!input.trim()) {
        return 'File path cannot be empty';
      }
      return true;
    }
  });

  // Step 3: Entry Function
  console.log('');
  const entryFunction = await promptInput('What is the name of the function or the endpoint that starts your agent? ', {
    default: config.entryFunction || 'main',
    validate: (input) => {
      if (!input.trim()) {
        return 'Function name cannot be empty';
      }
      return true;
    }
  });

  return {
    agentName,
    entryFile,
    entryFunction
  };
}

/**
 * Prompt for user input with validation
 */
function promptInput(question, options = {}) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const defaultText = options.default ? ` [${options.default}]` : '';
    const prompt = chalk.white(question) + chalk.gray(defaultText) + chalk.white(': ');

    rl.question(prompt, (answer) => {
      rl.close();

      // Use default if no input provided
      const input = answer.trim() || options.default || '';
      
      if (options.validate) {
        const validation = options.validate(input);
        if (validation !== true) {
          console.log(chalk.red(`❌ ${validation}`));
          // Recursively ask again
          promptInput(question, options).then(resolve).catch(reject);
          return;
        }
      }

      resolve(input);
    });

    // Handle Ctrl+C
    rl.on('SIGINT', () => {
      rl.close();
      reject(new Error('Setup cancelled by user'));
    });
  });
}

module.exports = { showConsoleInkSetup };
