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
// Code generation is now handled inline in the setup flow
const { writeConfig } = require('./config/writeConfig');
const { monitorTraces } = require('./monitor');
const { evaluateTraces } = require('./evaluate');

/**
 * Test connection with agent name
 */
async function testConnectionWithAgent(agentName) {
  const inquirer = require('inquirer').default;
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');

  try {
    // Get stored tokens
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('⚠️  No authentication token found. Skipping connection test.'));
      return;
    }

    // Initialize Handit API with stored tokens
    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    console.log(chalk.blue.bold('\n🔗 Testing connection with Handit...'));
    console.log(chalk.gray(`Testing agent: ${agentName}`));
    console.log(chalk.gray('This will verify that your agent can connect to Handit services.\n'));

    const { shouldTest } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldTest',
        message: 'Would you like to test the connection now?',
        default: true
      }
    ]);

    if (!shouldTest) {
      console.log(chalk.gray('Connection test skipped.'));
      return;
    }

    const testSpinner = ora('Testing connection...').start();
    let attempts = 0;
    const maxAttempts = 10;
    const intervalMs = 3000; // 3 seconds

    const testInterval = setInterval(async () => {
      attempts++;
      
      try {
        const result = await handitApi.testConnectionWithAgent(agentName);
        
        if (result.connected) {
          clearInterval(testInterval);
          testSpinner.succeed(chalk.green('✅ Connection successful!'));
          console.log(chalk.green(`Agent "${agentName}" is now connected to Handit.`));
          return;
        } else {
          testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts})`;
        }
      } catch (error) {
        testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts}) - ${error.message}`;
      }

      if (attempts >= maxAttempts) {
        clearInterval(testInterval);
        testSpinner.fail(chalk.red('❌ Connection test failed'));
        console.log(chalk.yellow('The connection test was unsuccessful.'));
        console.log(chalk.gray('This might be because:'));
        console.log(chalk.gray('  • Your agent is not running yet'));
        console.log(chalk.gray('  • The agent name does not match'));
        console.log(chalk.gray('  • Network connectivity issues'));
        console.log(chalk.gray('\nYou can retry the test or continue with the setup.'));
        
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: '🔄 Retry connection test', value: 'retry' },
              { name: '⏭️  Skip test and continue', value: 'skip' },
              { name: '❌ Cancel setup', value: 'cancel' }
            ],
            default: 'retry'
          }
        ]);

        if (action === 'cancel') {
          throw new Error('Setup cancelled by user');
        } else if (action === 'skip') {
          console.log(chalk.gray('Connection test skipped. Continuing with setup...'));
          return;
        } else if (action === 'retry') {
          // Reset and retry
          attempts = 0;
          testSpinner.start('Retrying connection test...');
          
          const retryInterval = setInterval(async () => {
            attempts++;
            
            try {
              const result = await handitApi.testConnectionWithAgent(agentName);
              
              if (result.connected) {
                clearInterval(retryInterval);
                testSpinner.succeed(chalk.green('✅ Connection successful!'));
                console.log(chalk.green(`Agent "${agentName}" is now connected to Handit.`));
                return;
              } else {
                testSpinner.text = `Retrying connection... (attempt ${attempts}/${maxAttempts})`;
              }
            } catch (error) {
              testSpinner.text = `Retrying connection... (attempt ${attempts}/${maxAttempts}) - ${error.message}`;
            }

            if (attempts >= maxAttempts) {
              clearInterval(retryInterval);
              testSpinner.fail(chalk.red('❌ Connection test failed again'));
              console.log(chalk.yellow('The connection test was unsuccessful again.'));
              
              const { finalAction } = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'finalAction',
                  message: 'What would you like to do?',
                  choices: [
                    { name: '🔄 Try one more time', value: 'retry' },
                    { name: '⏭️  Skip test and continue', value: 'skip' },
                    { name: '❌ Cancel setup', value: 'cancel' }
                  ],
                  default: 'skip'
                }
              ]);

              if (finalAction === 'cancel') {
                throw new Error('Setup cancelled by user');
              } else if (finalAction === 'skip') {
                console.log(chalk.gray('Connection test skipped. Continuing with setup...'));
                return;
              } else if (finalAction === 'retry') {
                // One final retry
                attempts = 0;
                testSpinner.start('Final connection test attempt...');
                
                const finalInterval = setInterval(async () => {
                  attempts++;
                  
                  try {
                    const result = await handitApi.testConnectionWithAgent(agentName);
                    
                    if (result.connected) {
                      clearInterval(finalInterval);
                      testSpinner.succeed(chalk.green('✅ Connection successful!'));
                      console.log(chalk.green(`Agent "${agentName}" is now connected to Handit.`));
                      return;
                    } else {
                      testSpinner.text = `Final attempt... (${attempts}/${maxAttempts})`;
                    }
                  } catch (error) {
                    testSpinner.text = `Final attempt... (${attempts}/${maxAttempts}) - ${error.message}`;
                  }

                  if (attempts >= maxAttempts) {
                    clearInterval(finalInterval);
                    testSpinner.fail(chalk.red('❌ Connection test failed'));
                    console.log(chalk.yellow('Connection test unsuccessful after multiple attempts.'));
                    console.log(chalk.gray('Continuing with setup...'));
                    return;
                  }
                }, intervalMs);
              }
            }
          }, intervalMs);
        }
      }
    }, intervalMs);

    // Wait for the first test to complete
    await new Promise((resolve) => {
      const checkComplete = () => {
        if (attempts >= maxAttempts) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });

  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      throw error;
    }
    console.log(chalk.yellow(`⚠️  Connection test error: ${error.message}`));
    console.log(chalk.gray('Continuing with setup...'));
  }
}

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
    const graphSpinner = ora('Building execution tree...').start();
    const callGraph = await extractCallGraph(projectInfo.entryFile, projectInfo.entryFunction, language);
    graphSpinner.succeed(`Found ${chalk.blue(callGraph.nodes.length)} functions`);
    
    // Show execution tree
    try {
      const { visualizeExecutionTree } = require('./utils/simpleTreeVisualizer');
      visualizeExecutionTree(callGraph.nodes, callGraph.edges, callGraph.nodes[0]?.id);
    } catch (error) {
      console.warn(`Warning: Could not visualize execution tree: ${error.message}`);
    }

    // Step 5: Analyze functions for tracking
    const analysisSpinner = ora('Analyzing functions for instrumentation...').start();
    const analyzedGraph = await analyzeFunctions(callGraph, language);
    analysisSpinner.succeed(`Identified ${chalk.blue(analyzedGraph.selectedNodes.length)} functions to track`);

    // Step 6: User confirmation
    const confirmedGraph = await confirmSelection(analyzedGraph, config.nonInteractive);

    // Step 7: Generate instrumented code iteratively with user confirmation
    const { generateInstrumentedCodeIteratively } = require('./generator');
    const selectedFunctionIds = confirmedGraph.nodes.filter(node => node.selected).map(node => node.id);
    const result = await generateInstrumentedCodeIteratively(
      selectedFunctionIds,
      confirmedGraph.nodes,
      language,
      projectInfo.agentName,
      config.projectRoot
    );
    
    const instrumentedFunctions = result.appliedFunctions;

    // Step 8: Test connection with agent
    await testConnectionWithAgent(projectInfo.agentName);

    // Step 9: Write configuration
    const configSpinner = ora('Writing Handit configuration...').start();
    await writeConfig(projectInfo, confirmedGraph);
    configSpinner.succeed('Configuration written');

    // Success summary
    console.log('\n' + chalk.green.bold('✅ Handit setup completed successfully!'));
    console.log(chalk.gray('Summary:'));
    console.log(`  • Agent: ${chalk.blue(projectInfo.agentName)}`);
    console.log(`  • Functions tracked: ${chalk.blue(confirmedGraph.nodes.filter(node => node.selected).length)}`);
    console.log(`  • Code generated: ${chalk.blue(instrumentedFunctions.length)} instrumented functions`);
    console.log(`  • Configuration: ${chalk.blue('handit.config.json')}`);
    console.log('\n' + chalk.yellow('Next steps:'));
    console.log('  1. Start your agent to begin collecting traces');
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