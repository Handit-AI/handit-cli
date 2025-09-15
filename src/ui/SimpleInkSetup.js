/**
 * Simple Ink-based setup that only replaces the setup prompts UI
 * while keeping the existing authentication and generation logic
 */

/**
 * Simple setup prompts with Ink UI (fallback version)
 */
async function runSimpleInkPrompts(config, language) {
  try {
    // Use console-based setup to avoid clearing terminal
    const { showConsoleInkSetup } = require('./ConsoleInkSetup.js');
    const projectInfo = await showConsoleInkSetup(config);
    
    // Run the smart detection like the original function
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
    console.log('Falling back to original setup prompts...');
    console.log('Error:', error.message);
    
    // Fallback to original setup prompts
    const { runPrompts } = require('../setup/prompts');
    return await runPrompts(config, language);
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
    const projectInfo = await runSimpleInkPrompts(config, null);

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

module.exports = { runSimpleInkSetup };
