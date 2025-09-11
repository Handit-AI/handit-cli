const chalk = require('chalk');
const ora = require('ora').default;
const path = require('path');
const fs = require('fs-extra');

// Import modules
const { authenticate } = require('./auth');
const { detectLanguage, detectLanguageFromFile } = require('./setup/detectLanguage');
const { runPrompts } = require('./setup/prompts');
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
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('No auth token found. Skipping connection test.'));
      return;
    }

    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    console.log(chalk.blue.bold('\nTest agent connection'));
    console.log(chalk.gray(`Agent: ${agentName}`));

    const { shouldTest } = await inquirer.prompt([
      { type: 'confirm', name: 'shouldTest', message: 'Test Handit connection now?', default: true }
    ]);

    if (!shouldTest) {
      console.log(chalk.gray('Connection test skipped.'));
      return;
    }

    let shouldContinue = true;
    while (shouldContinue) {
      const testSpinner = ora('Testing connection...').start();
      let attempts = 0; const maxAttempts = 10; const intervalMs = 3000;
      const testResult = await new Promise((resolve) => {
        const testInterval = setInterval(async () => {
          attempts++;
          try {
            const result = await handitApi.testConnectionWithAgent(agentName);
            if (result.connected) { clearInterval(testInterval); resolve({ success: true }); return; }
            testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts})`;
          } catch (error) {
            testSpinner.text = `Testing connection... (attempt ${attempts}/${maxAttempts}) - ${error.message}`;
          }
          if (attempts >= maxAttempts) { clearInterval(testInterval); resolve({ success: false }); }
        }, intervalMs);
      });

      if (testResult.success) {
        testSpinner.succeed(chalk.green('Connection successful.'));
        return;
      } else {
        testSpinner.fail(chalk.red('Connection test failed'));
        console.log(chalk.gray('Ensure your agent is running and the agent name matches, then retry.'));
        const { action } = await inquirer.prompt([
          { type: 'list', name: 'action', message: 'Next:', choices: [
            { name: 'Retry', value: 'retry' },
            { name: 'Skip', value: 'skip' },
            { name: 'Cancel', value: 'cancel' }
          ], default: 'retry' }
        ]);
        if (action === 'cancel') return;
        if (action === 'skip') return;
        shouldContinue = true;
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`Connection test error: ${error.message}`));
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
            value: node.model_id
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
async function setupRepositoryConnection(agentName = null, options = {}) {
  const inquirer = require('inquirer').default;
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');
  const { spawn } = require('child_process');
  const fs = require('fs-extra');

  const { fromSetup = false } = options;

  try {
    // Get stored tokens
    const tokenStorage = new TokenStorage();
    let tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('No auth token found.'));
      const authResult = await authenticate();
      if (!authResult.authenticated) {
        console.log(chalk.red('Authentication failed.'));
        return;
      }
      tokens = await tokenStorage.loadTokens();
    }

    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    if (fromSetup) {
      try {
        const integrationResp = await handitApi.getGitIntegration();
        const hasIntegration = integrationResp && Array.isArray(integrationResp.integrations) && integrationResp.integrations.length > 0;
        if (hasIntegration) {
          console.log(chalk.green('GitHub integration detected.'));
          return;
        }
      } catch (_) { /* ignore */ }
    }

    const { shouldConnect } = await inquirer.prompt([
      { type: 'confirm', name: 'shouldConnect', message: 'Install Handit GitHub App now?', default: true }
    ]);

    if (!shouldConnect) {
      console.log(chalk.gray('GitHub integration skipped.'));
      return;
    }

    const checkGitSpinner = ora('Checking git repository...').start();
    const isGitRepo = await new Promise((resolve) => {
      const gitCheck = spawn('git', ['rev-parse', '--git-dir'], { stdio: 'pipe', cwd: process.cwd() });
      gitCheck.on('close', (code) => { resolve(code === 0); });
    });

    if (!isGitRepo) {
      checkGitSpinner.fail('Not a git repository');
      console.log(chalk.gray('Initialize with: git init'));
      return;
    }
    checkGitSpinner.succeed('Git repository detected');

    // Get user's company ID for the GitHub App installation
    const userSpinner = ora('Fetching user info...').start();
    let companyId;
    
    try {
      const userInfo = await handitApi.getUserInfo();
      companyId = userInfo.company?.id || userInfo.companyId;
      userSpinner.succeed('User info loaded');
    } catch (error) {
      userSpinner.fail('Failed to load user info');
      console.log(chalk.gray('Re-authenticating...'));
      try {
        const authResult = await authenticate();
        if (authResult.authenticated) {
          tokens = await tokenStorage.loadTokens();
          handitApi.authToken = tokens.authToken;
          handitApi.apiToken = tokens.apiToken;
          const retrySpinner = ora('Retrying user info...').start();
          const retryUserInfo = await handitApi.getUserInfo();
          companyId = retryUserInfo.company?.id || retryUserInfo.companyId;
          retrySpinner.succeed('User info loaded');
        }
      } catch (_) {
        console.log(chalk.red('Unable to get company information. Install from dashboard if needed.'));
        return;
      }
    }

    if (!companyId) {
      console.log(chalk.yellow('No company ID found.'));
      return;
    }

    const githubAppUrl = `https://github.com/apps/handit-ai/installations/new?state=${companyId}`;

    const { shouldOpenGitHub } = await inquirer.prompt([
      { type: 'confirm', name: 'shouldOpenGitHub', message: 'Open GitHub App installation page?', default: true }
    ]);

    if (shouldOpenGitHub) {
      try {
        console.log(chalk.gray('Opening GitHub App installation page...'));
        let opened = false;
        try { const open = require('open'); await open(githubAppUrl, { wait: false }); opened = true; } catch (_) {
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            let command;
            switch (process.platform) { case 'darwin': command = `open "${githubAppUrl}"`; break; case 'win32': command = `start "" "${githubAppUrl}"`; break; default: command = `xdg-open "${githubAppUrl}"`; }
            await execAsync(command); opened = true;
          } catch (_) { /* ignore */ }
        }
        if (!opened) {
          console.log(chalk.blue('Open this URL:'));
          console.log(chalk.underline(githubAppUrl));
        }
        console.log(chalk.gray('Select repos and click Install, then return here.'));
        const { installationComplete } = await inquirer.prompt([
          { type: 'confirm', name: 'installationComplete', message: 'Confirm installation completed?', default: true }
        ]);
        if (installationComplete) console.log(chalk.green('GitHub integration completed.'));
      } catch (error) {
        console.log(chalk.red('Could not open browser automatically.'));
        console.log(chalk.blue('Open this URL:'));
        console.log(chalk.underline(githubAppUrl));
      }
    } else {
      console.log(chalk.blue('Install later:'));
      console.log(chalk.underline(githubAppUrl));
    }

  } catch (error) {
    console.log(chalk.yellow(`GitHub integration error: ${error.message}`));
  }
}

/**
 * After agent connection is confirmed, update its repository URL from local git
 */
async function updateRepositoryUrlForAgent(agentName) {
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');
  const { spawn } = require('child_process');

  try {
    if (!agentName) return;

    // Get git remote URL
    const remoteSpinner = ora('Fetching repository URL from git...').start();
    let repositoryUrl = null;

    repositoryUrl = await new Promise((resolve) => {
      const gitRemote = spawn('git', ['remote', 'get-url', 'origin'], { stdio: 'pipe', cwd: process.cwd() });
      let output = '';
      gitRemote.stdout.on('data', (data) => { output += data.toString(); });
      gitRemote.on('close', (code) => { resolve(code === 0 ? output.trim() : null); });
    });

    if (!repositoryUrl) {
      remoteSpinner.warn('No git remote found for this repository.');
      return;
    }

    remoteSpinner.succeed(`Found remote: ${repositoryUrl}`);

    // Load tokens and init API
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    if (!tokens || !tokens.authToken) return;

    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    // Get agents
    const agentsSpinner = ora('Locating your agent...').start();
    const agents = await handitApi.getAgents();
    const agent = agents.find(a => a.name === agentName);

    if (!agent) {
      agentsSpinner.fail('Agent not found to update repository URL.');
      const agent = await handitApi.createAgent({ name: agentName, repository: repositoryUrl });
      agentsSpinner.succeed(`Created agent: ${agent.name}`);
      return;
    }

    agentsSpinner.succeed(`Found agent: ${agent.name}`);

    // Update agent repository URL
    const updateSpinner = ora('Updating agent with repository URL...').start();
    await handitApi.updateAgent(agent.id, { repository: repositoryUrl });
    updateSpinner.succeed('Agent repository URL updated.');
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not update agent repository URL: ${error.message}`));
  }
}

/**
 * Optionally run initial assessment right after GitHub connection
 */
async function maybeRunInitialAssessment() {
  const inquirer = require('inquirer').default;
  const { HanditApi } = require('./api/handitApi');
  const { TokenStorage } = require('./auth/tokenStorage');
  const { detectFileAndFunction } = require('./utils/fileDetector');
  const { extractCallGraph } = require('./parser');

  function renderSteps(steps, headerPrinted) {
    const lines = [];
    if (!headerPrinted) {
      lines.push(chalk.cyan.bold('\nInitial assessment'));
      lines.push(chalk.gray('Tasks to apply:'));
    }
    for (const step of steps) {
      let mark = '[ ]';
      if (step.state === 'running') mark = '[⏳]';
      if (step.state === 'done') mark = '[✔]';
      if (step.state === 'failed') mark = '[✖]';
      lines.push(`${mark} ${step.label}`);
    }
    return lines.join('\n');
  }

  async function updateRender(steps, printedLinesCountRef) {
    const content = renderSteps(steps, printedLinesCountRef.current > 0);
    if (printedLinesCountRef.current === 0) {
      console.log(content);
      printedLinesCountRef.current = content.split('\n').length;
    } else {
      // Move cursor up and rewrite
      process.stdout.write(`\x1B[${printedLinesCountRef.current}A`);
      const lines = content.split('\n');
      for (let i = 0; i < printedLinesCountRef.current; i++) {
        process.stdout.write('\x1B[2K'); // clear line
        process.stdout.write((lines[i] || '') + '\n');
      }
    }
  }

  try {
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    if (!tokens || !tokens.authToken) return;

    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    // Retrieve git integration info
    const integrationSpinner = ora('Retrieving GitHub integration...').start();
    let integration;
    try {
      integration = await handitApi.getGitIntegration();
      integration = integration.integrations.length > 0 ? integration.integrations[0] : null;
      if (!integration) throw new Error('No integration');
      integrationSpinner.succeed('GitHub integration found');
    } catch (error) {
      integrationSpinner.fail('No GitHub integration found');
      return; // skip if there's no integration yet
    }

    const integrationId = integration?.id || integration?.data?.id;
    const repoUrl = integration?.repoUrl || integration?.data?.repoUrl;
    const mainBranch = integration?.defaultBranch || integration?.data?.defaultBranch || (await detectDefaultBranch()) || 'main';

    if (!integrationId) return;

    // Ask user if they want to run automatic assessment now
    const { shouldAssess } = await inquirer.prompt([
      { type: 'confirm', name: 'shouldAssess', message: 'Run an automatic assessment now?', default: true }
    ]);

    if (!shouldAssess) return;

    // Ask for entry point (file and function) similar to runPrompts
    console.log(chalk.cyan.bold('\nEntry point'));
    const { entryFile } = await inquirer.prompt([
      { type: 'input', name: 'entryFile', message: 'Entry file (relative to repo root):', default: 'index.js', validate: (v) => !!v.trim() || 'Required' }
    ]);
    const { entryFunction } = await inquirer.prompt([
      { type: 'input', name: 'entryFunction', message: 'Entry function:', default: 'main', validate: (v) => !!v.trim() || 'Required' }
    ]);

    // Detect exact file and function with line
    const detected = await detectFileAndFunction(entryFile, entryFunction, process.cwd());

    // Build execution tree (no confirmation UI here)
    const language = detectLanguageFromFile(detected.file);
    const callGraph = await extractCallGraph(detected.file, detected.function, language);

    // Convert execution tree to simplified calls list for payload
    const calls = callGraph.nodes.map(n => ({ file: n.file, fn: n.name })).slice(0, 50);

    const payload = {
      integrationId,
      repoUrl: repoUrl || (await inferRepoUrl()),
      branch: mainBranch,
      preferLocalClone: true,
      hintFilePath: detected.file,
      hintFunctionName: detected.function,
      executionTree: {
        node: detected.function,
        calls
      },
      useHintsFlow: true
    };

    // Prepare steps list rendering
    const steps = [
      { label: 'Discovering prompt entry points', state: 'pending' },
      { label: 'Understanding prompt flows and context', state: 'pending' },
      { label: 'Evaluating prompts against best practices', state: 'pending' },
      { label: 'Generating assessment report', state: 'pending' }
    ];
    const printed = { current: 0 };

    await updateRender(steps, printed);

    // Start API call in background
    const apiPromise = handitApi.assessAndPr(payload);

    // Progress through mocked steps with delays
    for (let i = 0; i < steps.length; i++) {
      steps[i].state = 'running';
      await updateRender(steps, printed);
      const isLast = i === steps.length - 1;

      if (!isLast) {
        // Use a slightly longer delay for earlier steps
        await new Promise(r => setTimeout(r, 1800));
        steps[i].state = 'done';
        await updateRender(steps, printed);
      } else {
        try {
          // Only mark the final step done when the backend responds
          await apiPromise;
          steps[i].state = 'done';
          await updateRender(steps, printed);
          const webRepo = normalizeRepoWebUrl(payload.repoUrl);
          const prUrl = webRepo ? `${webRepo}/pulls` : null;
          console.log(chalk.green('\n✔ Report ready.'));
          if (prUrl) {
            console.log(chalk.gray('View it in the repository PRs:'));
            console.log(chalk.underline(prUrl));
          }
          return;
        } catch (err) {
          steps[i].state = 'failed';
          await updateRender(steps, printed);
          console.log(chalk.red(`\n❌ Failed to start assessment: ${err.message}`));
          return;
        }
      }
    }

    // (No extra await here; handled in the final step)
  } catch (error) {
    // If we were rendering steps, try to mark the current step as failed
    console.log(chalk.red(`\n❌ Failed to start assessment: ${error.message}`));
  }
}

async function inferRepoUrl() {
  const { spawn } = require('child_process');
  return await new Promise((resolve) => {
    const gitRemote = spawn('git', ['remote', 'get-url', 'origin'], { stdio: 'pipe', cwd: process.cwd() });
    let output = '';
    gitRemote.stdout.on('data', (data) => { output += data.toString(); });
    gitRemote.on('close', (code) => { resolve(code === 0 ? output.trim() : null); });
  });
}

async function detectDefaultBranch() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Try origin/HEAD ref first
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref origin/HEAD');
      const ref = stdout.trim();
      if (ref) return ref.replace(/^origin\//, '');
    } catch (_) { /* ignore */ }

    // Fallback to parsing remote info
    try {
      const { stdout } = await execAsync('git remote show origin');
      const match = stdout.match(/HEAD branch:\s*(\S+)/);
      if (match && match[1]) return match[1];
    } catch (_) { /* ignore */ }

    // Fallback to local heads
    try {
      await execAsync('git show-ref --verify --quiet refs/heads/main');
      return 'main';
    } catch (_) { /* ignore */ }
    try {
      await execAsync('git show-ref --verify --quiet refs/heads/master');
      return 'master';
    } catch (_) { /* ignore */ }
  } catch (_) {
    console.log(chalk.red('Could not detect default branch.'));
  }
  return null;
}

function normalizeRepoWebUrl(rawUrl) {
  if (!rawUrl) return null;
  let url = rawUrl.trim();
  // git@github.com:owner/repo.git -> https://github.com/owner/repo
  const sshMatch = url.match(/^git@github\.com:(.+)$/);
  if (sshMatch) {
    url = `https://github.com/${sshMatch[1]}`;
  }
  // owner/repo -> https://github.com/owner/repo
  if (!/^https?:\/\//.test(url) && /^[^\s]+\/[^^\s]+$/.test(url)) {
    url = `https://github.com/${url}`;
  }
  // Ensure https
  url = url.replace(/^http:\/\//, 'https://');
  // Strip .git
  url = url.replace(/\.git$/, '');
  // Normalize trailing slash
  url = url.replace(/\/$/, '');
  return url;
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
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }
    
    const apiToken = authResult.apiToken;

    // Step 2: Connect GitHub repository (immediately after login)
    await setupRepositoryConnection(null, { fromSetup: true });

    // After connecting GitHub, fetch integration and optionally run assessment

    // Step 3: Run setup prompts (language will be detected from entry file)
    const projectInfo = await runPrompts(config, null);

    // Step 4: Detect language from entry file
    const languageSpinner = ora('Detecting file language...').start();
    const language = detectLanguageFromFile(projectInfo.entryFile);
    languageSpinner.succeed(`Detected: ${chalk.blue(language)} (from ${projectInfo.entryFile})`);

    // Step 5: Generate simplified entry point tracing
    const { SimplifiedCodeGenerator } = require('./generator/simplifiedGenerator');
    const simplifiedGenerator = new SimplifiedCodeGenerator(language, projectInfo.agentName, config.projectRoot, apiToken);
    
    const result = await simplifiedGenerator.generateEntryPointTracing(
      projectInfo.entryFile,
      projectInfo.entryFunction
    );

    if (!result.applied) {
      console.log(chalk.yellow('Setup cancelled - no tracing applied'));
      return;
    }

    // After confirming connection, update repository URL on the agent
    await updateRepositoryUrlForAgent(projectInfo.agentName);

    // Success summary
    console.log('\n' + chalk.green.bold('✅ Setup complete'));
    console.log(`Agent: ${chalk.blue(projectInfo.agentName)}`);
    console.log(`Entry point instrumented: ${chalk.blue(projectInfo.entryFunction)}`);
    console.log(`Config: ${chalk.blue('handit.config.json')}`);
    console.log('\nNext steps:');
    console.log(chalk.gray('  • Run your agent to collect traces'));
    console.log(chalk.gray('  • Open the dashboard to observe traces and PRs'));
    console.log(chalk.gray('  • Configure evaluators to analyze performance'));

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

/**
 * Evaluators setup workflow - Setup evaluators for an existing agent
 */
async function runEvaluatorsSetup(options = {}) {
  const inquirer = require('inquirer').default;

  try {
    console.log(chalk.blue.bold('🔍 Handit Evaluators Setup'));
    console.log(chalk.gray('Setting up evaluators for your agent...\n'));

    // Get list of agents to choose from
    const { HanditApi } = require('./api/handitApi');
    const { TokenStorage } = require('./auth/tokenStorage');
    
    // Get stored tokens
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.yellow('⚠️  No authentication token found. Please authenticate first.'));
      console.log(chalk.gray('Run "handit-cli setup" to authenticate.'));
      return;
    }

    // Initialize Handit API with stored tokens
    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    // Get agents list
    const agentsSpinner = ora('Loading your agents...').start();
    let agents;
    try {
      agents = await handitApi.getAgents();
      agentsSpinner.succeed(`Found ${agents.length} agents`);
    } catch (error) {
      agentsSpinner.fail(`Failed to load agents: ${error.message}`);
      return;
    }

    if (agents.length === 0) {
      console.log(chalk.yellow('⚠️  No agents found. Create an agent first by running setup.'));
      console.log(chalk.gray('Run "handit-cli setup" to create your first agent.'));
      return;
    }

    // Let user select an agent
    const { selectedAgent } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgent',
        message: 'Which agent would you like to setup evaluators for?',
        choices: agents.map(agent => ({
          name: `${agent.name} ${agent.id ? `(ID: ${agent.id})` : ''}`,
          value: agent.name
        }))
      }
    ]);

    // Run evaluator setup for selected agent
    await setupEvaluators(selectedAgent);

    console.log(chalk.green.bold('\n✅ Evaluators setup completed!'));
    console.log(chalk.gray('Your evaluators are now ready to analyze your agent\'s performance.'));

  } catch (error) {
    throw new Error(`Evaluators setup failed: ${error.message}`);
  }
}

module.exports = {
  runSetup,
  runTraceMonitor,
  runEvaluation,
  runGitHubConnection,
  runEvaluatorsSetup
}; 