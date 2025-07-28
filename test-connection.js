#!/usr/bin/env node

const chalk = require('chalk');
const { HanditApi } = require('./src/api/handitApi');
const { TokenStorage } = require('./src/auth/tokenStorage');

async function testConnection() {
  try {
    console.log(chalk.blue.bold('🔗 Testing Handit Connection'));
    
    // Load tokens
    const tokenStorage = new TokenStorage();
    const tokens = await tokenStorage.loadTokens();
    
    if (!tokens || !tokens.authToken) {
      console.log(chalk.red('❌ No authentication tokens found'));
      console.log(chalk.gray('Please run handit-cli setup first to authenticate'));
      return;
    }

    console.log(chalk.green('✅ Authentication tokens loaded'));

    // Initialize API
    const handitApi = new HanditApi();
    handitApi.authToken = tokens.authToken;
    handitApi.apiToken = tokens.apiToken;

    // Test connection
    const testAgentName = 'test-agent-' + Date.now();
    console.log(chalk.gray(`Testing with agent name: ${testAgentName}`));

    const result = await handitApi.testConnectionWithAgent(testAgentName);
    
    if (result.connected) {
      console.log(chalk.green('✅ Connection test successful!'));
    } else {
      console.log(chalk.yellow('⚠️  Connection test returned false'));
    }

  } catch (error) {
    console.log(chalk.red(`❌ Connection test failed: ${error.message}`));
  }
}

testConnection(); 