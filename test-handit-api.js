const { HanditApi } = require('./src/api/handitApi');
const { TokenStorage } = require('./src/auth/tokenStorage');
const { EnvironmentConfig } = require('./src/config/environment');

async function testHanditIntegration() {
  console.log('🔍 Testing Handit API Integration');
  console.log('─'.repeat(80));
  
  // Test environment configuration
  console.log('\n1. Testing Environment Configuration:');
  const config = new EnvironmentConfig();
  console.log(`   API URL: ${config.getApiUrl()}`);
  console.log(`   Dashboard URL: ${config.getDashboardUrl()}`);
  console.log(`   CLI Auth URL: ${config.getCliAuthUrl()}`);
  console.log(`   Test Mode: ${config.isTestMode()}`);
  
  // Test Handit API client
  console.log('\n2. Testing Handit API Client:');
  const handitApi = new HanditApi();
  console.log(`   API URL: ${handitApi.apiUrl}`);
  console.log(`   CLI Auth URL: ${handitApi.getCliAuthUrl()}`);
  
  // Test token storage
  console.log('\n3. Testing Token Storage:');
  const tokenStorage = new TokenStorage();
  console.log(`   Config Directory: ${tokenStorage.configDir}`);
  console.log(`   Tokens File: ${tokenStorage.tokensFile}`);
  
  // Test if user is authenticated
  const isAuth = await tokenStorage.hasValidTokens();
  console.log(`   Has Valid Tokens: ${isAuth}`);
  
  if (isAuth) {
    console.log('\n4. Loading stored tokens:');
    const tokens = await tokenStorage.loadTokens();
    console.log(`   User: ${tokens.user.firstName} ${tokens.user.lastName}`);
    console.log(`   Company: ${tokens.company.name}`);
    console.log(`   Auth Token: ${tokens.authToken.substring(0, 20)}...`);
    console.log(`   API Token: ${tokens.apiToken.substring(0, 20)}...`);
  } else {
    console.log('\n4. No valid tokens found');
  }
  
  // Test mock authentication (for development)
  if (config.isTestMode()) {
    console.log('\n5. Testing Mock Authentication (Test Mode):');
    
    const mockTokens = {
      authToken: 'mock-auth-token-' + Date.now(),
      apiToken: 'mock-api-token-' + Date.now(),
      stagingApiToken: 'mock-staging-token-' + Date.now(),
      user: {
        id: 1,
        email: 'test@handit.ai',
        firstName: 'Test',
        lastName: 'User'
      },
      company: {
        id: 1,
        name: 'Test Company'
      }
    };
    
    try {
      await tokenStorage.storeTokens(mockTokens);
      console.log('   ✅ Mock tokens stored successfully');
      
      const loadedTokens = await tokenStorage.loadTokens();
      console.log(`   ✅ Tokens loaded: ${loadedTokens.user.firstName} ${loadedTokens.user.lastName}`);
      
      // Clean up
      await tokenStorage.clearTokens();
      console.log('   ✅ Tokens cleared');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Handit API integration test completed!');
}

testHanditIntegration().catch(console.error); 