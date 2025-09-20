#!/usr/bin/env node

/**
 * Test the silent scaffolding functionality
 */

const path = require('path');
const fs = require('fs-extra');

async function testSilentScaffolding() {
  console.log('🧪 Testing silent scaffolding...\n');
  
  try {
    // Import the scaffolding service
    const { ScaffoldingService } = require('./src/scaffold/index.js');
    const scaffoldingService = new ScaffoldingService();
    
    // Create test config
    const configData = {
      "project": {
        "name": "Silent Test Agent",
        "language": "javascript",
        "default_llm_provider": "openai"
      },
      "agent": {
        "stages": ["test_node"],
        "subAgents": 0
      },
      "tools": [
        {
          "node_name": "test_node",
          "selected": ["test_tool"]
        }
      ],
      "llm_nodes": [
        {
          "node_name": "test_node",
          "model": {
            "provider": "openai",
            "name": "gpt-4"
          }
        }
      ]
    };
    
    // Test silent mode
    const targetPath = path.join(process.cwd(), 'test-silent-agent');
    
    // Clean up any existing test directory
    if (await fs.pathExists(targetPath)) {
      await fs.remove(targetPath);
    }
    
    console.log('Generating project in silent mode...');
    console.log('(No verbose output should appear below)');
    console.log('---');
    
    // Generate the project in silent mode
    await scaffoldingService.generateProject(configData, targetPath, { silent: true });
    
    console.log('---');
    console.log('✅ Silent scaffolding completed successfully!');
    
    // Verify the project was created
    const projectExists = await fs.pathExists(targetPath);
    const packageJsonExists = await fs.pathExists(path.join(targetPath, 'package.json'));
    
    console.log(`\n📋 Verification:`);
    console.log(`   Project directory exists: ${projectExists ? '✅' : '❌'}`);
    console.log(`   Package.json exists: ${packageJsonExists ? '✅' : '❌'}`);
    
    if (projectExists && packageJsonExists) {
      console.log(`\n✅ Silent scaffolding test passed!`);
    } else {
      console.log(`\n❌ Silent scaffolding test failed`);
    }
    
  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test
testSilentScaffolding();
