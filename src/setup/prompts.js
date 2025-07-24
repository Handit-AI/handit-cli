const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { detectFileAndFunction } = require('../utils/fileDetector');

/**
 * Run setup prompts to gather project information
 * @param {Object} config - Configuration object
 * @param {string} language - Detected language
 * @returns {Promise<Object>} - Project information
 */
async function runPrompts(config, language) {
  // Skip prompts if non-interactive mode
  if (config.nonInteractive) {
    return {
      agentName: 'my-agent',
      entryFile: config.entryFile || 'index.js',
      entryFunction: config.entryFunction || 'main'
    };
  }

  console.log(chalk.blue.bold('\n🤖 Agent Setup'));
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

  // Agent entry point
  console.log(chalk.cyan.bold('\n🎯 Step 2: Agent Entry Point'));
  console.log(chalk.gray(`Where does your agent start? This could be an endpoint handler, a main function, or any function that initiates your agent's execution.\n`));
  console.log(chalk.gray('Examples:'));
  console.log(chalk.gray('  • Express route handler: app.post("/chat", handleChat)'));
  console.log(chalk.gray('  • Main agent function: startAgent() or processRequest()'));
  console.log(chalk.gray('  • Webhook endpoint: handleWebhook() or processMessage()\n'));
  
  const { entryFile } = await inquirer.prompt([
    {
      type: 'input',
      name: 'entryFile',
      message: `What is the path to the file containing your agent's entry function?`,
      default: config.entryFile || (language === 'javascript' ? 'index.js' : 'main.py'),
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

  // Use smart detection to find the correct file and function
  const detected = await detectFileAndFunction(entryFile, entryFunction, config.projectRoot);

  // Confirm setup
  console.log(chalk.cyan.bold('\n✅ Step 3: Confirm Setup'));
  console.log(chalk.gray('Please review your agent configuration:\n'));
  
  console.log(chalk.white(`  Agent Name: ${chalk.blue(agentName)}`));
  console.log(chalk.white(`  Agent Entry File: ${chalk.blue(entryFile)}`));
  console.log(chalk.white(`  Agent Entry Function: ${chalk.blue(entryFunction)}`));
  console.log(chalk.white(`  Language: ${chalk.blue(language)}`));
  console.log('');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Does this look correct?',
      default: true
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Setup cancelled. Run the command again to restart.'));
    process.exit(0);
  }

  return {
    agentName,
    entryFile: detected.file,
    entryFunction: detected.function
  };
}

module.exports = {
  runPrompts
}; 