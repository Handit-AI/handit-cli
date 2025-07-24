const chalk = require('chalk');
const ora = require('ora').default;
const path = require('path');
const fs = require('fs-extra');

// Import modules
const { authenticate } = require('./auth');
const { detectLanguage } = require('./setup/detectLanguage');
const { runPrompts } = require('./setup/prompts');
const { extractCallGraph } = require('./parser');
const { analyzeFunctions } = require('./analyzer');
const { confirmSelection } = require('./confirm/treePrompt');
const { instrumentCode } = require('./generator');
const { writeConfig } = require('./config/writeConfig');
const { monitorTraces } = require('./monitor');
const { evaluateTraces } = require('./evaluate');

/**
 * Setup workflow - Initial agent setup
 */
async function runSetup(options = {}) {
  const config = {
    dev: options.dev || false,
    nonInteractive: options.yes || false,
    entryFile: options.file,
    entryFunction: options.entry,
    projectRoot: process.cwd(),
    ...options
  };

  try {
    // Step 1: Authentication
    console.log(chalk.blue.bold('🚀 Handit Setup CLI'));
    console.log(chalk.gray('Setting up Handit instrumentation for your agent...\n'));
    
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }

    // Step 2: Detect project language
    const languageSpinner = ora('Detecting project language...').start();
    const language = await detectLanguage(config.projectRoot);
    languageSpinner.succeed(`Detected ${chalk.blue(language)} project`);

    // Step 3: Run setup prompts
    const projectInfo = await runPrompts(config, language);

    // Step 4: Extract call graph
    const graphSpinner = ora('Analyzing function call graph...').start();
    const callGraph = await extractCallGraph(projectInfo.entryFile, projectInfo.entryFunction, language);
    graphSpinner.succeed(`Found ${chalk.blue(callGraph.nodes.length)} functions`);

    // Step 5: Analyze functions for tracking
    const analysisSpinner = ora('Analyzing functions for instrumentation...').start();
    const analyzedGraph = await analyzeFunctions(callGraph, language);
    analysisSpinner.succeed(`Identified ${chalk.blue(analyzedGraph.selectedNodes.length)} functions to track`);

    // Step 6: User confirmation
    const confirmedGraph = await confirmSelection(analyzedGraph, config.nonInteractive);

    // Step 7: Instrument code
    const instrumentSpinner = ora('Instrumenting code with Handit...').start();
    const instrumentedFiles = await instrumentCode(confirmedGraph, language);
    instrumentSpinner.succeed(`Instrumented ${chalk.blue(instrumentedFiles.length)} files`);

    // Step 8: Write configuration
    const configSpinner = ora('Writing Handit configuration...').start();
    await writeConfig(projectInfo, confirmedGraph);
    configSpinner.succeed('Configuration written');

    // Success summary
    console.log('\n' + chalk.green.bold('✅ Handit setup completed successfully!'));
    console.log(chalk.gray('Summary:'));
    console.log(`  • Agent: ${chalk.blue(projectInfo.agentName)}`);
    console.log(`  • Functions tracked: ${chalk.blue(confirmedGraph.selectedNodes.length)}`);
    console.log(`  • Files modified: ${chalk.blue(instrumentedFiles.length)}`);
    console.log(`  • Configuration: ${chalk.blue('handit.config.json')}`);
    console.log('\n' + chalk.yellow('Next steps:'));
    console.log('  1. Run your agent to collect traces');
    console.log('  2. Use "handit-cli monitor" to collect execution traces');
    console.log('  3. Use "handit-cli evaluate" to analyze traces and improve setup');

  } catch (error) {
    throw new Error(`Setup failed: ${error.message}`);
  }
}

/**
 * Monitor workflow - Collect execution traces
 */
async function runTraceMonitor(options = {}) {
  const config = {
    dev: options.dev || false,
    timeout: parseInt(options.timeout) || 300,
    outputFile: options.output || 'traces.json',
    projectRoot: process.cwd(),
    ...options
  };

  try {
    console.log(chalk.blue.bold('📊 Starting trace monitoring...'));
    console.log(chalk.gray(`Monitoring for ${config.timeout} seconds...\n`));

    const traces = await monitorTraces(config);
    
    console.log(chalk.green.bold('✅ Trace collection completed!'));
    console.log(chalk.gray('Summary:'));
    console.log(`  • Traces collected: ${chalk.blue(traces.length)}`);
    console.log(`  • Output file: ${chalk.blue(config.outputFile)}`);
    console.log('\n' + chalk.yellow('Next step:'));
    console.log('  Use "handit-cli evaluate" to analyze the traces');

  } catch (error) {
    throw new Error(`Trace monitoring failed: ${error.message}`);
  }
}

/**
 * Evaluate workflow - Analyze traces and suggest improvements
 */
async function runEvaluation(options = {}) {
  const config = {
    dev: options.dev || false,
    tracesFile: options.traces || 'traces.json',
    outputFile: options.output || 'evaluation.json',
    projectRoot: process.cwd(),
    ...options
  };

  try {
    console.log(chalk.blue.bold('🔍 Evaluating traces...'));
    
    const evaluation = await evaluateTraces(config);
    
    console.log(chalk.green.bold('✅ Evaluation completed!'));
    console.log(chalk.gray('Summary:'));
    console.log(`  • Functions analyzed: ${chalk.blue(evaluation.analyzedFunctions)}`);
    console.log(`  • Suggestions: ${chalk.blue(evaluation.suggestions.length)}`);
    console.log(`  • Output file: ${chalk.blue(config.outputFile)}`);
    
    if (evaluation.suggestions.length > 0) {
      console.log('\n' + chalk.yellow('Suggestions:'));
      evaluation.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.description}`);
      });
    }

  } catch (error) {
    throw new Error(`Evaluation failed: ${error.message}`);
  }
}

module.exports = {
  runSetup,
  runTraceMonitor,
  runEvaluation
}; 