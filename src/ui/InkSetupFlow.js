/**
 * Ink-based setup flow that wraps the existing setup logic
 * with beautiful UI components while keeping the same functionality
 */

// Dynamic imports will be handled in the functions themselves

/**
 * Ink-based authentication that wraps the existing auth logic
 */
async function authenticateWithInk() {
  try {
    const { showAuthFlow } = await import('./InkAuthFlow.js');
    const authResult = await showAuthFlow();
    
    // If authentication was successful, we still need to call the real auth function
    // to get the actual tokens and handle the real authentication logic
    if (authResult.authenticated) {
      // Import the real auth function
      const { authenticate } = require('../auth');
      
      // Call the real authentication function
      // This will handle the actual API calls and token storage
      const realAuthResult = await authenticate();
      
      return realAuthResult;
    } else {
      return { authenticated: false };
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return { authenticated: false };
  }
}

/**
 * Ink-based setup prompts that wraps the existing prompts logic
 */
async function runPromptsWithInk(config, language) {
  try {
    const { showSetupWizard } = await import('./InkSetupWizard.js');
    const projectInfo = await showSetupWizard(config);
    
    // After getting the project info from Ink UI, we need to run the smart detection
    // that the original runPrompts function does
    const { detectFileAndFunction } = require('../utils/fileDetector');
    
    const detected = await detectFileAndFunction(
      projectInfo.entryFile, 
      projectInfo.entryFunction, 
      config.projectRoot
    );

    return {
      agentName: projectInfo.agentName,
      entryFile: detected.file,
      entryFunction: detected.function
    };
  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      throw new Error('Setup cancelled by user');
    }
    console.error('Setup prompts failed:', error.message);
    throw error;
  }
}

/**
 * Ink-based setup flow that replaces the main setup function
 * while keeping all the existing logic intact
 */
async function runSetupWithInk(options = {}) {
  const chalk = require('chalk');
  const ora = require('ora');
  
  const config = {
    dev: options.dev || false,
    nonInteractive: options.yes || false,
    entryFile: options.file,
    entryFunction: options.entry,
    projectRoot: process.cwd(),
    ...options
  };

  try {
    // Step 1: Authentication with Ink UI
    console.log('\n'); // Add some space
    const authResult = await authenticateWithInk();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }
    
    const apiToken = authResult.apiToken;
    const stagingApiToken = authResult.stagingApiToken;

    // Step 2: Run setup prompts with Ink UI
    console.log('\n'); // Add some space
    const projectInfo = await runPromptsWithInk(config, null);

    // Step 3: Detect language from entry file (keep existing logic)
    const languageSpinner = ora('Detecting file language...').start();
    const { detectLanguageFromFile } = require('../setup/detectLanguage');
    const language = detectLanguageFromFile(projectInfo.entryFile);
    languageSpinner.succeed(`Detected: ${chalk.blue(language)} (from ${projectInfo.entryFile})`);

    // Step 4: Generate simplified entry point tracing (keep existing logic)
    const { SimplifiedCodeGenerator } = require('../generator/simplifiedGenerator');
    const simplifiedGenerator = new SimplifiedCodeGenerator(
      language, 
      projectInfo.agentName, 
      config.projectRoot, 
      apiToken, 
      stagingApiToken
    );
    
    const result = await simplifiedGenerator.generateEntryPointTracing(
      projectInfo.entryFile,
      projectInfo.entryFunction
    );

    if (!result.applied) {
      console.log(chalk.yellow('Setup cancelled - no tracing applied'));
      return;
    }

    // Step 5: Update repository URL (keep existing logic)
    const { updateRepositoryUrlForAgent } = require('../index');
    await updateRepositoryUrlForAgent(projectInfo.agentName);

    // Step 6: Success summary (keep existing logic)
    console.log('\n' + chalk.green.bold('✅ Setup complete'));
    console.log(`Agent: ${chalk.blue(projectInfo.agentName)}`);
    console.log(`Entry point instrumented: ${chalk.blue(projectInfo.entryFunction)}`);
    console.log(`Config: ${chalk.blue('handit.config.json')}`);

    // Step 7: Show setup instructions (keep existing logic)
    simplifiedGenerator.showSetupInstructions();

  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      console.log(chalk.yellow('Setup cancelled by user'));
      return;
    }
    throw new Error(`Setup failed: ${error.message}`);
  }
}

module.exports = { 
  authenticateWithInk, 
  runPromptsWithInk, 
  runSetupWithInk 
};
