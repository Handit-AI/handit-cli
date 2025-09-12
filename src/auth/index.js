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
  console.log(chalk.gray('Authenticate this machine with Handit.\n'));

  // Check if already authenticated
  const isAuth = await isAuthenticated();
  if (isAuth) {
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    console.log(chalk.green('✅ Already authenticated.'));
    return { 
      authenticated: true, 
      apiToken: tokens?.apiToken,
      stagingApiToken: tokens?.stagingApiToken
    };
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
  
  console.log(chalk.cyan('\nOpening default browser to CLI auth page...'));

  // Try to open browser (cross-platform)
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

    if (!opened) {
      console.log(chalk.yellow('Could not open browser automatically.'));
      console.log(chalk.blue('Open this URL in your browser:'));
      console.log(chalk.underline(cliAuthUrl));
    }
  } catch (error) {
    console.log(chalk.red('Unexpected error opening the browser.'));
    console.log(chalk.blue('Open this URL in your browser:'));
    console.log(chalk.underline(cliAuthUrl));
    console.log(chalk.gray(`Error: ${error.message}`));
  }
  
  const { cliCode } = await inquirer.prompt([
    {
      type: 'input',
      name: 'cliCode',
      message: 'Paste the CLI authentication code:',
      validate: (input) => {
        const code = input.trim();
        if (code.length === 0) return 'CLI code is required';
        if (code.length < 7) return 'CLI code seems too short';
        return true;
      }
    }
  ]);

  const spinner = ora('Authenticating...').start();
  
  try {
    const authResult = await handitApi.authenticateWithCode(cliCode.trim());
    
    if (authResult.success) {
      await saveAuth(authResult);
      spinner.succeed('Authenticated.');
      
      console.log(chalk.green(`Authenticated as ${authResult.user.firstName} ${authResult.user.lastName} (${authResult.company.name}).`));
      
      return { 
        authenticated: true, 
        user: authResult.user, 
        apiToken: authResult.apiToken,
        stagingApiToken: authResult.stagingApiToken
      };
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
  
  console.log(chalk.blue('\nCreate your Handit account'));
  console.log(chalk.gray('Open the dashboard and sign up:'));
  console.log(chalk.cyan(handitApi.getDashboardUrl() + '/signup'));
  console.log(chalk.gray('After creating your account, run this command again to login.'));
  process.exit(0);
}

module.exports = {
  authenticate,
  isAuthenticated,
  saveAuth
}; 