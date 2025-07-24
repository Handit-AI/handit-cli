const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora').default;

/**
 * Check if user is authenticated with Handit
 * @returns {Promise<boolean>} - True if authenticated
 */
async function isAuthenticated() {
  try {
    const configPath = path.join(process.cwd(), '.handit-auth.json');
    if (await fs.pathExists(configPath)) {
      const auth = await fs.readJson(configPath);
      // TODO: Validate token with Handit API
      return auth.token && auth.token !== 'expired';
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Save authentication token
 * @param {string} token - Authentication token
 * @param {Object} user - User information
 */
async function saveAuth(token, user) {
  const configPath = path.join(process.cwd(), '.handit-auth.json');
  await fs.writeJson(configPath, {
    token,
    user,
    createdAt: new Date().toISOString()
  }, { spaces: 2 });
}

/**
 * Handle authentication flow
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticate() {
  console.log(chalk.blue.bold('🔐 Handit Authentication'));
  console.log(chalk.gray('Let\'s get you set up with Handit...\n'));

  // Check if already authenticated
  const isAuth = await isAuthenticated();
  if (isAuth) {
    console.log(chalk.green('✅ You\'re already logged in to Handit!'));
    return { authenticated: true };
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
  console.log(chalk.blue('\n📝 Login to Handit'));
  
  const { loginMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'loginMethod',
      message: 'How would you like to log in?',
      choices: [
        { name: 'Open Handit in browser (recommended)', value: 'browser' },
        { name: 'Enter credentials manually', value: 'manual' }
      ]
    }
  ]);

  if (loginMethod === 'browser') {
    return await handleBrowserLogin();
  } else {
    return await handleManualLogin();
  }
}

/**
 * Handle browser-based login
 * @returns {Promise<Object>} - Login result
 */
async function handleBrowserLogin() {
  const spinner = ora('Opening Handit in your browser...').start();
  
  try {
    // TODO: Implement actual browser opening
    console.log(chalk.yellow('\n🌐 Please open: https://handit.com/login'));
    console.log(chalk.gray('After logging in, you\'ll receive a token to paste here.\n'));
    
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Paste your authentication token:',
        validate: (input) => {
          if (!input.trim()) {
            return 'Token cannot be empty';
          }
          return true;
        }
      }
    ]);

    spinner.succeed('Authentication successful!');
    
    // Mock user data
    const user = {
      email: 'user@example.com',
      name: 'Handit User'
    };
    
    await saveAuth(token, user);
    return { authenticated: true, user };
    
  } catch (error) {
    spinner.fail('Authentication failed');
    throw error;
  }
}

/**
 * Handle manual login
 * @returns {Promise<Object>} - Login result
 */
async function handleManualLogin() {
  const credentials = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (input) => {
        if (!input.includes('@')) {
          return 'Please enter a valid email address';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate: (input) => {
        if (input.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return true;
      }
    }
  ]);

  const spinner = ora('Logging in to Handit...').start();
  
  try {
    // TODO: Implement actual login API call
    await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API delay
    
    // Mock successful login
    const token = 'mock_token_' + Date.now();
    const user = {
      email: credentials.email,
      name: 'Handit User'
    };
    
    await saveAuth(token, user);
    spinner.succeed('Login successful!');
    
    return { authenticated: true, user };
    
  } catch (error) {
    spinner.fail('Login failed');
    throw new Error('Invalid email or password');
  }
}

/**
 * Handle signup flow
 * @returns {Promise<Object>} - Signup result
 */
async function handleSignup() {
  console.log(chalk.blue('\n🚀 Create your Handit account'));
  
  const userData = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Email:',
      validate: (input) => {
        if (!input.includes('@')) {
          return 'Please enter a valid email address';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
      validate: (input) => {
        if (input.length < 8) {
          return 'Password must be at least 8 characters';
        }
        return true;
      }
    },
    {
      type: 'password',
      name: 'confirmPassword',
      message: 'Confirm password:',
      validate: (input, answers) => {
        if (input !== answers.password) {
          return 'Passwords do not match';
        }
        return true;
      }
    }
  ]);

  const spinner = ora('Creating your Handit account...').start();
  
  try {
    // TODO: Implement actual signup API call
    await new Promise(resolve => setTimeout(resolve, 3000)); // Mock API delay
    
    // Mock successful signup
    const token = 'mock_token_' + Date.now();
    const user = {
      email: userData.email,
      name: userData.email.split('@')[0] // Use email prefix as name
    };
    
    await saveAuth(token, user);
    spinner.succeed('Account created successfully!');
    
    return { authenticated: true, user };
    
  } catch (error) {
    spinner.fail('Signup failed');
    throw new Error('Failed to create account. Please try again.');
  }
}

module.exports = {
  authenticate,
  isAuthenticated,
  saveAuth
}; 