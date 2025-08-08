const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora').default;
const { HanditApi } = require('../api/handitApi');
const { TokenStorage } = require('./tokenStorage');

/**
 * Check if user is authenticated with Handit
 * @returns {Promise<boolean>} - True if authenticated
 */
async function isAuthenticated() {
  try {
    const tokenStorage = new TokenStorage();
    return await tokenStorage.hasValidTokens();
  } catch (error) {
    return false;
  }
}

/**
 * Save authentication data
 * @param {Object} authData - Authentication data with tokens and user info
 */
async function saveAuth(authData) {
  try {
    const tokenStorage = new TokenStorage();
    await tokenStorage.storeTokens(authData);
    return true;
  } catch (error) {
    throw new Error(`Failed to save authentication: ${error.message}`);
  }
}

/**
 * Handle authentication flow
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticate() {
  console.log(chalk.blue.bold('\n🔐 Handit Authentication'));
  console.log(chalk.gray('Let\'s get you set up with Handit...\n'));

  // Check if already authenticated
  const isAuth = await isAuthenticated();
  if (isAuth) {
    console.log(chalk.green('✅ You\'re already logged in to Handit!'));
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    return { authenticated: true, apiToken: tokens?.apiToken };
  }

  // Ask user if they have an account
  const { hasAccount } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you already have a Handit account?',
      default: true
    }
  ]);

  if (hasAccount) {
    return await handleLogin();
  } else {
    return await handleSignup();
  }
}

/**
 * Handle login flow
 * @returns {Promise<Object>} - Login result
 */
async function handleLogin() {
  console.log(chalk.blue('\n🔑 Login to Handit'));
  return await handleBrowserLogin();
}

/**
 * Handle browser-based login with CLI code
 * @returns {Promise<Object>} - Login result
 */
async function handleBrowserLogin() {
  const handitApi = new HanditApi();
  const cliAuthUrl = handitApi.getCliAuthUrl();
  
  console.log(chalk.cyan('\n🌐 Opening Handit CLI authentication...'));
  console.log(chalk.gray('Please complete the authentication process in your browser.'));

  // Try to open the URL with multiple approaches
  try {
    let opened = false;

    // Method 1: Try using the open package
    try {
      const open = require('open');
      await open(cliAuthUrl, { wait: false });
      opened = true;
    } catch (error1) {
      // Method 2: Fallback to platform-specific commands
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        let command;
        switch (process.platform) {
          case 'darwin':
            command = `open "${cliAuthUrl}"`;
            break;
          case 'win32':
            command = `start "" "${cliAuthUrl}"`;
            break;
          default:
            command = `xdg-open "${cliAuthUrl}"`;
            break;
        }

        await execAsync(command);
        opened = true;
      } catch (error2) {
        // Will handle below
      }
    }

    if (opened) {
      // Small delay to allow browser to start
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(chalk.green('✅ Browser opened successfully!'));
    } else {
      console.log(chalk.yellow('⚠️  Could not open your browser automatically.'));
      console.log(chalk.blue('Please manually open this URL:'));
      console.log(chalk.underline(cliAuthUrl));
    }
  } catch (error) {
    console.log(chalk.red('❌ Unexpected error opening the browser.'));
    console.log(chalk.blue('Please manually open this URL:'));
    console.log(chalk.underline(cliAuthUrl));
    console.log(chalk.gray(`Error details: ${error.message}`));
  }
  
  console.log(chalk.gray('\nSteps:'));
  console.log(chalk.gray('1. Complete authentication in your browser'));
  console.log(chalk.gray('2. Copy the CLI code from the dashboard'));
  console.log(chalk.gray('3. Paste it below\n'));
  
  const { cliCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'cliCode',
      message: 'Enter the CLI code from Handit dashboard:',
      validate: (input) => {
        const code = input.trim();
        if (code.length === 0) return 'CLI code is required';
        if (code.length < 7) return 'CLI code seems too short';
        return true;
      }
    }
  ]);

  const spinner = ora('Authenticating with Handit...').start();
  
  try {
    const authResult = await handitApi.authenticateWithCode(cliCode.trim());
    
    if (authResult.success) {
      await saveAuth(authResult);
      spinner.succeed('Authentication successful!');
      
      console.log(chalk.green('✅ Successfully authenticated with Handit!'));
      console.log(chalk.gray(`Welcome, ${authResult.user.firstName} ${authResult.user.lastName}`));
      console.log(chalk.gray(`Company: ${authResult.company.name}`));
      
      return { authenticated: true, user: authResult.user, apiToken: authResult.apiToken };
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    spinner.fail('Authentication failed');
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Handle signup flow
 * @returns {Promise<Object>} - Signup result
 */
async function handleSignup() {
  const handitApi = new HanditApi();
  
  console.log(chalk.blue('\n🚀 Create your Handit account'));
  console.log(chalk.gray('Please create your account at the Handit dashboard first.\n'));
  
  console.log(chalk.blue('🌐 Visit the Handit dashboard to create your account:'));
  console.log(chalk.cyan(handitApi.getDashboardUrl() + '/signup'));
  console.log(chalk.gray('\nAfter creating your account, run this command again to login.'));
  process.exit(0);
}

module.exports = {
  authenticate,
  isAuthenticated,
  saveAuth
}; 