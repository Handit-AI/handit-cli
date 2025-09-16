/**
 * Simple Ink-based setup that only replaces the setup prompts UI
 * while keeping the existing authentication and generation logic
 */

/**
 * Simple setup prompts with Ink UI (fallback version)
 */
async function runSimpleInkPrompts(config, language) {
  try {
    // Use modular Ink wizard with component architecture
    const { showModularSetupWizard } = require('./ModularInkSetupWizard.js');
    const projectInfo = await showModularSetupWizard(config);
    
    // The modular wizard handles file detection internally
    return {
      agentName: projectInfo.agentName,
      entryFile: projectInfo.entryFile,
      entryFunction: projectInfo.entryFunction
    };
  } catch (error) {
    // If user cancelled with Ctrl+C, don't fall back - just exit
    console.log('Error:', error.message);
    return null;
  }
}

/**
 * Simple Ink setup flow that only replaces the setup prompts
 * while keeping all other existing logic intact
 */
async function runSimpleInkSetup(options = {}) {
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
    // Step 1: Use existing authentication (keep original logic)
    const { authenticate } = require('../auth');
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }
    
    const apiToken = authResult.apiToken;
    const stagingApiToken = authResult.stagingApiToken;

    // Step 2: Use unified Ink wizard for setup only
    console.log('\n'); // Add some space
    const configWithTokens = {
      ...config,
      apiToken,
      stagingApiToken
    };
    const projectInfo = await runSimpleInkPrompts(configWithTokens, null);

    // Step 3: Check if code generation was already applied by the Ink wizard
    // If we have agentName and entryFile, assume the Ink wizard completed successfully
    if (projectInfo.applied === true || (projectInfo.agentName && projectInfo.entryFile)) {
      console.log(chalk.green('✅ Setup already completed in Ink wizard'));
      console.log(chalk.gray('All steps including code generation, repository URL update, and setup instructions have been completed.'));
      process.exit(0);
    } else {
      // Step 4: Detect language from entry file (fallback for non-Ink flows)
      const languageSpinner = ora('Detecting file language...').start();
      const { detectLanguageFromFile } = require('../setup/detectLanguage');
      const language = detectLanguageFromFile(projectInfo.entryFile);
      languageSpinner.succeed(`Detected: ${chalk.blue(language)} (from ${projectInfo.entryFile})`);
      // Step 5: Generate simplified entry point tracing (fallback for non-Ink flows)
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
    }

  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      console.log(chalk.yellow('\nSetup cancelled by user'));
      process.exit(0); // Clean exit instead of continuing
    }
    throw new Error(`Setup failed: ${error.message}`);
  }
}

module.exports = { runSimpleInkSetup };
