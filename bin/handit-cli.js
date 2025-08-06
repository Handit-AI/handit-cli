#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { runSetup, runTraceMonitor, runEvaluation, runGitHubConnection, runEvaluatorsSetup } = require('../src/index.js');

const program = new Command();

program
  .name('handit-cli')
  .description('Handit CLI for agent setup and trace monitoring')
  .version('1.0.2')
  .option('--test', 'Use test environment (localhost)');

// Setup command
program
  .command('setup')
  .description('Set up Handit instrumentation for your agent')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Handit Setup CLI'));
      console.log(chalk.gray('Setting up Handit instrumentation for your agent...\n'));
      
      await runSetup(options);
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      if (options.dev) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Monitor command for trace collection
program
  .command('monitor')
  .description('Monitor agent execution and collect traces')
  .option('-d, --dev', 'Enable development mode with verbose logging')
  .option('-t, --timeout <seconds>', 'Timeout for trace collection (default: 300)', '300')
  .option('-o, --output <file>', 'Output file for traces (default: traces.json)', 'traces.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('📊 Handit Trace Monitor'));
      console.log(chalk.gray('Monitoring agent execution for traces...\n'));
      
      await runTraceMonitor(options);
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      if (options.dev) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Evaluate command for setup evaluation
program
  .command('evaluate')
  .description('Evaluate collected traces and suggest setup improvements')
  .option('-d, --dev', 'Enable development mode with verbose logging')
  .option('-t, --traces <file>', 'Traces file to evaluate (default: traces.json)', 'traces.json')
  .option('-o, --output <file>', 'Output file for evaluation (default: evaluation.json)', 'evaluation.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔍 Handit Setup Evaluation'));
      console.log(chalk.gray('Evaluating traces and suggesting improvements...\n'));
      
      await runEvaluation(options);
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      if (options.dev) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// GitHub integration command
program
  .command('github')
  .description('Connect your repository to Handit for automatic PR creation')
  .option('-d, --dev', 'Enable development mode with verbose logging')
  .action(async (options) => {
    try {
      await runGitHubConnection(options);
    } catch (error) {
      console.error(chalk.red.bold('❌ Error:'), error.message);
      if (options.dev) {
        console.error(chalk.gray('Stack trace:'), error.stack);
      }
      process.exit(1);
    }
  });

// Evaluators setup command
program
  .command('evaluators-setup')
  .description('Setup evaluators for an existing agent')
  .option('-d, --dev', 'Enable development mode with verbose logging')
  .action(async (options) => {
    try {
      await runEvaluatorsSetup(options);
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
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse(); 