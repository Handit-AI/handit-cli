#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { runOnboard } = require('../src/index.js');

const program = new Command();

program
  .name('handit-cli')
  .description('Set up Handit by detecting and instrumenting agent execution graphs')
  .version('1.0.0')
  .option('-d, --dev', 'Enable development mode with verbose logging')
  .option('-y, --yes', 'Skip confirmation prompts (non-interactive mode)')
  .option('-f, --file <path>', 'Specify entry file path')
  .option('-e, --entry <function>', 'Specify entry function name')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Handit Onboard CLI'));
      console.log(chalk.gray('Setting up Handit instrumentation for your agent...\n'));
      
      await runOnboard(options);
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      if (options.dev) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red.bold('❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse(); 