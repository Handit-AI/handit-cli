#!/usr/bin/env node

/**
 * Debug script for testing code generation
 */

const { SimplifiedCodeGenerator } = require('./src/generator/simplifiedGenerator');
const fs = require('fs');
const path = require('path');

async function testCodeGeneration() {
  console.log('🔍 Testing code generation...\n');

  // Create a simple test file
  const testFileContent = `import express from 'express';

const app = express();

app.post('/api/process', async (req, res) => {
  const result = await processData(req.body);
  res.json(result);
});

async function processData(data) {
  // Some processing logic
  return { processed: true, data };
}

export default app;`;

  const testFilePath = path.join(__dirname, 'test-file.js');
  
  try {
    // Write test file
    fs.writeFileSync(testFilePath, testFileContent);
    console.log('✅ Test file created:', testFilePath);

    // Initialize generator
    const generator = new SimplifiedCodeGenerator('javascript', 'test-agent', __dirname);
    
    console.log('🤖 Testing addHanditIntegrationToFile...');
    
    const modifiedContent = await generator.addHanditIntegrationToFile(
      testFileContent,
      testFilePath,
      'processData',
      'test-agent'
    );
    
    console.log('✅ Code generation completed!');
    console.log('\n📋 Original content:');
    console.log(testFileContent);
    console.log('\n📋 Modified content:');
    console.log(modifiedContent);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Clean up test file
    try {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Test file cleaned up');
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Check if debug log was created
  const debugLogPath = path.join(__dirname, 'debug-code-generation.log');
  if (fs.existsSync(debugLogPath)) {
    console.log('\n📋 Debug log created at:', debugLogPath);
    console.log('📄 Debug log contents:');
    console.log('─'.repeat(50));
    
    try {
      const logContent = fs.readFileSync(debugLogPath, 'utf8');
      console.log(logContent);
    } catch (error) {
      console.log('❌ Could not read debug log:', error.message);
    }
  } else {
    console.log('\n⚠️  No debug log file found at:', debugLogPath);
  }
}

// Run the test
testCodeGeneration().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
