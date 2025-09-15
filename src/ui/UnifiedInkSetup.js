/**
 * Unified Ink-based setup that handles the entire flow seamlessly
 * Replaces all console output and inquirer prompts with beautiful Ink UI
 */

/**
 * Unified Ink setup that handles everything in one seamless experience
 */
async function runUnifiedInkSetup(options = {}) {
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
    console.log(chalk.blue.bold('\n🔐 Handit Authentication'));
    const { authenticate } = require('../auth');
    const authResult = await authenticate();
    if (!authResult.authenticated) {
      throw new Error('Authentication required to continue');
    }
    
    const apiToken = authResult.apiToken;
    const stagingApiToken = authResult.stagingApiToken;

    // Step 2: Use Ink-based setup prompts (new UI)
    console.log('\n'); // Add some space
    const { showSetupWizard } = await import('./InkSetupWizard.js');
    const projectInfo = await showSetupWizard(config);

    // Step 3: Use Ink-based file detection and function selection
    const { detectFileAndFunction } = require('../utils/fileDetector');
    
    const detected = await detectFileAndFunction(
      projectInfo.entryFile, 
      projectInfo.entryFunction, 
      config.projectRoot
    );

    const finalProjectInfo = {
      agentName: projectInfo.agentName,
      entryFile: detected.file,
      entryFunction: detected.function
    };

    // Step 4: Detect language from entry file (keep existing logic)
    const languageSpinner = ora('Detecting file language...').start();
    const { detectLanguageFromFile } = require('../setup/detectLanguage');
    const language = detectLanguageFromFile(finalProjectInfo.entryFile);
    languageSpinner.succeed(`Detected: ${chalk.blue(language)} (from ${finalProjectInfo.entryFile})`);

    // Step 5: Generate simplified entry point tracing (keep existing logic)
    const { SimplifiedCodeGenerator } = require('../generator/simplifiedGenerator');
    const simplifiedGenerator = new SimplifiedCodeGenerator(
      language, 
      finalProjectInfo.agentName, 
      config.projectRoot, 
      apiToken, 
      stagingApiToken
    );
    
    const result = await simplifiedGenerator.generateEntryPointTracing(
      finalProjectInfo.entryFile,
      finalProjectInfo.entryFunction
    );

    if (!result.applied) {
      console.log(chalk.yellow('Setup cancelled - no tracing applied'));
      return;
    }

    // Step 6: Update repository URL (keep existing logic)
    const { updateRepositoryUrlForAgent } = require('../index');
    await updateRepositoryUrlForAgent(finalProjectInfo.agentName);

    // Step 7: Success summary (keep existing logic)
    console.log('\n' + chalk.green.bold('✅ Setup complete'));
    console.log(`Agent: ${chalk.blue(finalProjectInfo.agentName)}`);
    console.log(`Entry point instrumented: ${chalk.blue(finalProjectInfo.entryFunction)}`);
    console.log(`Config: ${chalk.blue('handit.config.json')}`);

    // Step 8: Show setup instructions (keep existing logic)
    simplifiedGenerator.showSetupInstructions();

  } catch (error) {
    if (error.message === 'Setup cancelled by user') {
      console.log(chalk.yellow('Setup cancelled by user'));
      return;
    }
    throw new Error(`Setup failed: ${error.message}`);
  }
}

module.exports = { runUnifiedInkSetup };
