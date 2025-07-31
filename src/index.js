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

    // Main retry loop
    let shouldContinue = true;
    while (shouldContinue) {
      const testSpinner = ora('Testing connection...').start();
      let attempts = 0;
      const maxAttempts = 10;
      const intervalMs = 3000; // 3 seconds

      // Wait for connection test to complete or fail
      const testResult = await new Promise((resolve) => {
        const testInterval = setInterval(async () => {
          attempts++;
          
          try {
            const result = await handitApi.testConnectionWithAgent(agentName);
            
            if (result.connected) {
              clearInterval(testInterval);
              resolve({ success: true });
              return;
            } else {
              testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts})`;
            }
          } catch (error) {
            testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts}) - ${error.message}`;
          }

          if (attempts >= maxAttempts) {
            clearInterval(testInterval);
            resolve({ success: false });
          }
        }, intervalMs);
      });

      if (testResult.success) {
        testSpinner.succeed(chalk.green('✅ Connection successful!'));
        console.log(chalk.green(`Agent "${agentName}" is now connected to Handit.`));
        return;
      } else {
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
          shouldContinue = false;
          return;
        } else if (action === 'retry') {
          console.log(chalk.gray('Retrying connection test...'));
          shouldContinue = true; // Continue the while loop for another attempt
        }
      }
    }

  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      throw error;
    }
    console.log(chalk.yellow(`⚠️  Connection test error: ${error.message}`));
    console.log(chalk.gray('Continuing with setup...'));
  }
}

/**
 * Setup evaluators for an agent
 */
async function setupEvaluators(agentName) {
  const inquirer = require('inquirer').default;
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');

  try {
    // Get stored tokens
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('⚠️  No authentication token found. Skipping evaluator setup.'));
      return;
    }

    // Initialize Handit API with stored tokens
    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    console.log(chalk.blue.bold('\n🔍 Setting up evaluators...'));
    console.log(chalk.gray('Evaluators help analyze and improve your agent\'s performance.\n'));

    const { shouldSetupEvaluators } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldSetupEvaluators',
        message: 'Would you like to add evaluators to your agent?',
        default: true
      }
    ]);

    if (!shouldSetupEvaluators) {
      console.log(chalk.gray('Evaluator setup skipped.'));
      return;
    }

    // Get agents and find the one with matching name
    const agentsSpinner = ora('Finding your agent...').start();
    const agents = await handitApi.getAgents();
    agentsSpinner.succeed('Agents retrieved');

    const agent = agents.find(a => a.name === agentName);
    if (!agent) {
      console.log(chalk.yellow('⚠️  Agent not found. You need to send traces first before adding evaluators.'));
      console.log(chalk.gray('Run your agent and collect traces, then try again.'));
      return;
    }

    console.log(chalk.green(`✅ Found agent: ${agent.name}`));

    // Main evaluator setup loop
    let shouldContinue = true;
    while (shouldContinue) {
      // Get available evaluators
      const evaluatorsSpinner = ora('Loading available evaluators...').start();
      const evaluators = await handitApi.getEvaluationPrompts();

      evaluatorsSpinner.succeed(`Found ${evaluators.length} evaluators`);

      // Let user select an evaluator
      const { selectedEvaluator } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedEvaluator',
          message: 'Select an evaluator to add:',
          choices: evaluators.map(evaluator => ({
            name: `${evaluator.name}`,
            value: evaluator
          }))
        }
      ]);

      console.log(chalk.blue(`Selected: ${selectedEvaluator.name}`));

      // Check if evaluator has default integration token
      if (selectedEvaluator.defaultIntegrationTokenId) {
        console.log(chalk.green('✅ Evaluator has default integration token'));
      } else {
        console.log(chalk.yellow('⚠️  Evaluator needs integration token setup'));
        
        // Get providers
        const providersSpinner = ora('Loading providers...').start();
        const providers = await handitApi.getProviders();
        providersSpinner.succeed(`Found ${providers.length} providers`);

        // Let user select provider
        const { selectedProvider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedProvider',
            message: 'Select a provider:',
            choices: providers.map(provider => ({
              name: `${provider.name}`,
              value: provider
            }))
          }
        ]);

        // Let user select default model from provider config
        const { selectedModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedModel',
            message: 'Select default model:',
            choices: selectedProvider.config.models.map(model => ({
              name: model,
              value: model
            }))
          }
        ]);

        // Get integration token from user
        const { integrationToken } = await inquirer.prompt([
          {
            type: 'password',
            name: 'integrationToken',
            message: `Enter your ${selectedProvider.name} API token:`,
            validate: (input) => {
              if (!input.trim()) return 'API token is required';
              return true;
            }
          }
        ]);

        // Create integration token
        const tokenSpinner = ora('Creating integration token...').start();
        const integrationTokenResult = await handitApi.createIntegrationToken(
          selectedProvider.id,
          `${selectedProvider.name} - ${selectedEvaluator.name}`,
          integrationToken,
          'evaluator'
        );
        tokenSpinner.succeed('Integration token created');

        // Update evaluator with default token and model
        const updateSpinner = ora('Updating evaluator defaults...').start();
        await handitApi.updateEvaluatorDefaults(
          selectedEvaluator.id,
          integrationTokenResult.id,
          selectedModel
        );
        updateSpinner.succeed('Evaluator defaults updated');

        console.log(chalk.green('✅ Integration token configured for evaluator'));
      }

      // Get agent nodes with models
      const agentNodes = agent.AgentNodes || [];
      const nodesWithModels = agentNodes.filter(node => node.Model);
      
      if (nodesWithModels.length === 0) {
        console.log(chalk.yellow('⚠️  No models found in agent nodes.'));
        console.log(chalk.gray('You need to have models in your agent to add evaluators.'));
        shouldContinue = false;
      }

      // Let user select models to associate with evaluator
      const { selectedModels } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedModels',
          message: 'Select models to associate with this evaluator:',
          choices: nodesWithModels.map(node => ({
            name: `${node.Model.name || 'Unnamed Node'}`,
            value: node.id
          }))
        }
      ]);

      if (selectedModels.length === 0) {
        console.log(chalk.yellow('⚠️  No models selected. Skipping evaluator association.'));
      } else {
        // Associate evaluator with selected models
        const associateSpinner = ora('Associating evaluator with models...').start();
        
        for (const modelId of selectedModels) {
          try {
            await handitApi.associateEvaluatorToModel(modelId, selectedEvaluator.id);
          } catch (error) {
            console.log(chalk.yellow(`⚠️  Failed to associate with model ${modelId}: ${error.message}`));
          }
        }
        
        associateSpinner.succeed(`Associated evaluator with ${selectedModels.length} model(s)`);
        console.log(chalk.green(`✅ Evaluator "${selectedEvaluator.name}" added successfully!`));
      }

      // Ask if user wants to add more evaluators
      const { addMoreEvaluators } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMoreEvaluators',
          message: 'Would you like to add another evaluator?',
          default: false
        }
      ]);

      if (!addMoreEvaluators) {
        shouldContinue = false;
      }
    }

    console.log(chalk.green('✅ Evaluator setup completed!'));

  } catch (error) {
    console.log(chalk.yellow(`⚠️  Evaluator setup error: ${error.message}`));
    console.log(chalk.gray('Continuing with setup...'));
  }
}

/**
 * Setup repository connection for automatic PR creation
 */
async function setupRepositoryConnection(agentName = null) {
  const inquirer = require('inquirer').default;
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');
  const { spawn } = require('child_process');
  const fs = require('fs-extra');

  try {
    // Get stored tokens
    const tokenStorage = new TokenStorage();
    let tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('⚠️  No authentication token found. Please authenticate first.'));
      
      // Attempt to authenticate
      const authResult = await authenticate();
      if (!authResult.authenticated) {
        console.log(chalk.red('❌ Authentication failed. Cannot connect repository.'));
        return;
      }
      
      // Reload tokens after authentication
      tokens = await tokenStorage.loadTokens();
    }

    // Initialize Handit API with stored tokens
    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    console.log(chalk.blue.bold('\n🔗 Repository Integration'));
    console.log(chalk.gray('Connect your repository to enable automatic PR creation when new prompts are detected.\n'));

    const { shouldConnect } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldConnect',
        message: 'Would you like to connect your repository to Handit?',
        default: true
      }
    ]);

    if (!shouldConnect) {
      console.log(chalk.gray('Repository connection skipped.'));
      return;
    }

    // Simple check if we're in a git repository
    const checkGitSpinner = ora('Checking git repository...').start();
    
    const isGitRepo = await new Promise((resolve) => {
      const gitCheck = spawn('git', ['rev-parse', '--git-dir'], { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      gitCheck.on('close', (code) => {
        resolve(code === 0);
      });
    });

    if (!isGitRepo) {
      checkGitSpinner.fail('Not a git repository');
      console.log(chalk.yellow('⚠️  This directory is not a git repository.'));
      console.log(chalk.gray('Initialize a git repository first: git init'));
      return;
    }

    checkGitSpinner.succeed('Git repository detected');

    // Get user's company ID for the GitHub App installation
    const userSpinner = ora('Getting user information...').start();
    let companyId;
    
    try {
      const userInfo = await handitApi.getUserInfo();

      companyId = userInfo.company?.id || userInfo.companyId;
      userSpinner.succeed('User information retrieved');
    } catch (error) {
      userSpinner.fail('Could not retrieve user information');
      console.log(chalk.yellow('⚠️  Unable to get company information for GitHub App setup.'));
      console.log(chalk.gray('Attempting to re-authenticate to get updated user information...'));
      
      // Try to re-authenticate to get updated company information
      try {
        const authResult = await authenticate();
        if (authResult.authenticated) {
          // Reload tokens and try again
          tokens = await tokenStorage.loadTokens();
          handitApi.authToken = tokens.authToken;
          handitApi.apiToken = tokens.apiToken;
          
          const retrySpinner = ora('Retrying user information...').start();
          const retryUserInfo = await handitApi.getUserInfo();

          companyId = retryUserInfo.company?.id || retryUserInfo.companyId;
          retrySpinner.succeed('User information retrieved after re-authentication');
        }
      } catch (retryError) {
        console.log(chalk.red('❌ Re-authentication failed. Cannot get company information.'));
        console.log(chalk.gray('You can manually install the GitHub App from your Handit dashboard.'));
        return;
      }
    }

    if (!companyId) {
      console.log(chalk.yellow('⚠️  No company ID found even after re-authentication.'));
      console.log(chalk.gray('Please ensure your account is properly set up with a company.'));
      console.log(chalk.gray('Contact support if this issue persists: support@handit.ai'));
      return;
    }

    // Open GitHub App installation URL
    const githubAppUrl = `https://github.com/apps/handit-ai/installations/new?state=${companyId}`;
    
    console.log(chalk.blue('\n🔗 GitHub App Installation:'));
    console.log(chalk.gray('We\'ll open GitHub in your browser to install the Handit AI App.'));
    console.log(chalk.gray('This will enable automatic PR creation when new prompts are detected.\n'));

    const { shouldOpenGitHub } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOpenGitHub',
        message: 'Open GitHub App installation page?',
        default: true
      }
    ]);

    if (shouldOpenGitHub) {
      const open = require('open');
      
      try {
        console.log(chalk.blue('🌐 Opening GitHub App installation page...'));
        await open(githubAppUrl);
        
        console.log(chalk.green('✅ GitHub App installation page opened!'));
        console.log(chalk.gray('Instructions:'));
        console.log(chalk.gray('  1. Select the repositories you want to connect'));
        console.log(chalk.gray('  2. Click "Install" to complete the setup'));
        console.log(chalk.gray('  3. Return to this terminal once installation is complete\n'));

        const { installationComplete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'installationComplete',
            message: 'Have you completed the GitHub App installation?',
            default: true
          }
        ]);

        if (installationComplete) {
          console.log(chalk.green('✅ Repository integration completed!'));
          console.log(chalk.gray('Benefits:'));
          console.log(chalk.gray('  • Automatic PR creation when new prompts are detected'));
          console.log(chalk.gray('  • Prompt optimization suggestions'));
          console.log(chalk.gray('  • Version control for AI interactions'));
          console.log(chalk.gray('  • Team collaboration on prompt improvements\n'));
        } else {
          console.log(chalk.yellow('📝 You can complete the installation later from your Handit dashboard.'));
        }

      } catch (error) {
        console.log(chalk.red('❌ Could not open browser automatically.'));
        console.log(chalk.blue('Please manually open this URL to install the GitHub App:'));
        console.log(chalk.underline(githubAppUrl));
      }
    } else {
      console.log(chalk.blue('📝 To connect your repository later, visit:'));
      console.log(chalk.underline(githubAppUrl));
      console.log(chalk.gray('Or access it from your Handit dashboard.\n'));
    }

  } catch (error) {
    console.log(chalk.yellow(`⚠️  Repository connection error: ${error.message}`));
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
    
    const apiToken = authResult.apiToken;

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
      config.projectRoot,
      apiToken
    );
    
    const instrumentedFunctions = result.appliedFunctions;

    // Step 8: Apply all pending code changes
    const applySpinner = ora('Applying code changes to files...').start();
    await result.generator.applyAllPendingChanges();
    applySpinner.succeed('Code changes applied');

    // Step 9: Test connection with agent
    await testConnectionWithAgent(projectInfo.agentName);

    // Step 10: Setup evaluators
    await setupEvaluators(projectInfo.agentName);

    // Step 11: Setup repository connection
    await setupRepositoryConnection();

    // Success summary
    console.log('\n' + chalk.green.bold('✅ Handit setup completed successfully!'));
    console.log(chalk.gray('Summary:'));
    console.log(`  • Agent: ${chalk.blue(projectInfo.agentName)}`);
    console.log(`  • Functions tracked: ${chalk.blue(confirmedGraph.nodes.filter(node => node.selected).length)}`);
    console.log(`  • Code generated: ${chalk.blue(instrumentedFunctions.length)} instrumented functions`);
    console.log(`  • Configuration: ${chalk.blue('handit.config.json')}`);
    console.log('\n' + chalk.yellow('Next Steps:'));
    console.log(chalk.gray('  1. Run your agent to start collecting traces'));
    console.log(chalk.gray('  2. Monitor performance in your Handit dashboard'));
    console.log(chalk.gray('  3. If connected to repository, watch for automatic PR suggestions'));
    console.log(chalk.gray('  4. Use evaluators to analyze and improve your agent\'s performance'));

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

/**
 * GitHub connection workflow - Only login and repository connection
 */
async function runGitHubConnection(options = {}) {
  const config = {
    dev: options.dev || false,
    projectRoot: process.cwd(),
    ...options
  };

  try {
    // Step 1: Authentication
    console.log(chalk.blue.bold('🔗 Handit GitHub Integration'));
    console.log(chalk.gray('Connect your repository to Handit for automatic PR creation...\n'));
    
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }

    // Step 2: Setup repository connection (no agent name needed for GitHub integration)
    await setupRepositoryConnection();

    // Success summary
    console.log('\n' + chalk.green.bold('✅ GitHub integration completed!'));
    console.log(chalk.gray('Your repository is now connected to Handit.'));
    console.log(chalk.gray('You\'ll receive automatic PR suggestions when new prompts are detected.'));
    console.log(chalk.gray('The Handit GitHub App has been installed and configured.'));

  } catch (error) {
    throw new Error(`GitHub integration failed: ${error.message}`);
  }
}

module.exports = {
  runSetup,
  runTraceMonitor,
  runEvaluation,
  runGitHubConnection
}; 