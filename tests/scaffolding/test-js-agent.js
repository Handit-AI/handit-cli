#!/usr/bin/env node

const path = require('path');
const { ScaffoldingService } = require('../../src/scaffold/index.js');

async function testJSGeneration() {
  console.log('🧪 Testing JavaScript Agent Configuration\n');

  const testConfig = {
    name: 'Custom JS Agent Test',
    config: {
      "project": {
        "name": "Custom JS Agent",
        "language": "javascript",
        "default_llm_provider": "openai"
      },
      "agent": {
        "stages": ["llm_1", "llm_2", "llm_3"],
        "subAgents": 0
      },
      "tools": [
        { "node_name": "llm_1", "selected": ["web_search"] },
        { "node_name": "llm_2", "selected": ["calculator"] },
        { "node_name": "llm_3", "selected": ["file_io"] }
      ],
      "llm_nodes": [
        { "node_name": "llm_1", "model": { "provider": "openai", "name": "gpt-4" } },
        { "node_name": "llm_2", "model": { "provider": "openai", "name": "gpt-4" } },
        { "node_name": "llm_3", "model": { "provider": "openai", "name": "gpt-4" } }
      ]
    }
  };

  try {
    console.log(`📁 Testing: ${testConfig.name}`);
    console.log('─'.repeat(60));
    
    const targetPath = path.join(__dirname, 'test-custom-js-agent-output/custom-js-agent');
    console.log(`Generating project at: ${targetPath}`);

    const scaffoldingService = new ScaffoldingService();
    await scaffoldingService.generateProject(testConfig.config, targetPath);

    console.log('\n✅ Project generated successfully!');
    console.log(`📁 Project location: ${targetPath}`);

    // Verify the generated structure
    const fs = require('fs-extra');
    
    // Check if main files exist
    const mainFile = path.join(targetPath, 'index.js');
    const packageFile = path.join(targetPath, 'package.json');
    const srcDir = path.join(targetPath, 'src');
    
    if (await fs.pathExists(mainFile)) {
      console.log('✅ Main index.js file generated correctly');
    } else {
      console.log('❌ Main index.js file missing');
    }
    
    if (await fs.pathExists(packageFile)) {
      console.log('✅ package.json file generated correctly');
    } else {
      console.log('❌ package.json file missing');
    }
    
    if (await fs.pathExists(srcDir)) {
      console.log('✅ src directory created correctly');
    } else {
      console.log('❌ src directory missing');
    }

    console.log('\n🎉 JavaScript agent test completed!');
    console.log(`📂 Check the '${path.dirname(targetPath)}' directory for the generated project.`);

  } catch (error) {
    console.error('❌ Error during JavaScript agent generation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testJSGeneration().catch(console.error);
