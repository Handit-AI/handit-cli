const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * Run setup prompts to gather project information
 * @param {Object} config - Configuration object
 * @param {string} language - Detected language
 * @returns {Promise<Object>} - Project information
 */
async function runPrompts(config, language) {
  const questions = [];

  // Skip prompts if non-interactive mode
  if (config.nonInteractive) {
    return {
      hasAccount: true,
      agentName: 'my-agent',
      entryFile: config.entryFile || 'index.js',
      entryFunction: config.entryFunction || 'main'
    };
  }

  // Welcome message
  console.log(chalk.blue.bold('\n📋 Project Setup'));
  console.log(chalk.gray('Let\'s gather some information about your project...\n'));

  // Check if user has Handit account
  questions.push({
    type: 'confirm',
    name: 'hasAccount',
    message: 'Do you have a Handit account?',
    default: true
  });

  // Agent name
  questions.push({
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
  });

  // Entry file
  if (!config.entryFile) {
    questions.push({
      type: 'input',
      name: 'entryFile',
      message: `What is the path to your main entry file?`,
      default: language === 'javascript' ? 'index.js' : 'main.py',
      validate: async (input) => {
        const filePath = path.resolve(input);
        if (!await fs.pathExists(filePath)) {
          return `File not found: ${input}`;
        }
        return true;
      }
    });
  }

  // Entry function
  if (!config.entryFunction) {
    questions.push({
      type: 'input',
      name: 'entryFunction',
      message: 'What is the name of your main entry function?',
      default: 'main',
      validate: (input) => {
        if (!input.trim()) {
          return 'Function name cannot be empty';
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
          return 'Function name must be a valid identifier';
        }
        return true;
      }
    });
  }

  const answers = await inquirer.prompt(questions);

  return {
    hasAccount: answers.hasAccount,
    agentName: answers.agentName,
    entryFile: config.entryFile || answers.entryFile,
    entryFunction: config.entryFunction || answers.entryFunction
  };
}

module.exports = {
  runPrompts
}; 