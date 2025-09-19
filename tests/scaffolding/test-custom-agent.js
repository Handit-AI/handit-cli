#!/usr/bin/env node
/**
 * Test script for custom agent configuration
 * Agent name, default model, three LLM nodes, three tools
 */

const { ScaffoldingService } = require('../../src/scaffold');
const path = require('path');

async function testCustomAgent() {
    console.log('🧪 Testing Custom Agent Configuration\n');

    const testConfig = {
        name: 'Custom Agent Test',
        config: {
            "project": {
                "name": "Custom Agent",
                "language": "python",
                "default_llm_provider": "openai"
            },
            "agent": {
                "stages": ["llm_1", "llm_2", "llm_3"],
                "subAgents": 0
            },
            "tools": [
                {
                    "node_name": "llm_1",
                    "selected": ["web_search"]
                },
                {
                    "node_name": "llm_2", 
                    "selected": ["calculator"]
                },
                {
                    "node_name": "llm_3",
                    "selected": ["file_io"]
                }
            ],
            "llm_nodes": [
                {
                    "node_name": "llm_1",
                    "model": {
                        "provider": "openai",
                        "name": "gpt-4"
                    }
                },
                {
                    "node_name": "llm_2",
                    "model": {
                        "provider": "openai", 
                        "name": "gpt-4"
                    }
                },
                {
                    "node_name": "llm_3",
                    "model": {
                        "provider": "openai",
                        "name": "gpt-4"
                    }
                }
            ]
        }
    };

    const scaffold = new ScaffoldingService();
    const testDir = path.join(__dirname, 'test-custom-agent-output');

    console.log(`\n📁 Testing: ${testConfig.name}`);
    console.log('─'.repeat(60));
    
    try {
        const outputPath = path.join(testDir, testConfig.config.project.name.toLowerCase().replace(/\s+/g, '-'));
        
        console.log(`Generating project at: ${outputPath}`);
        await scaffold.generateProject(testConfig.config, outputPath);
        
        console.log(`✅ Successfully generated: ${testConfig.name}`);
        
        // Verify the generated structure
        const fs = require('fs-extra');
        const configPath = path.join(outputPath, 'src/config.py');
        
        if (await fs.pathExists(configPath)) {
            const configContent = await fs.readFile(configPath, 'utf8');
            
            // Check if agent name is present
            if (configContent.includes('Custom Agent')) {
                console.log('✅ Agent name configured correctly');
            } else {
                console.log('❌ Agent name not found in config');
            }
            
            // Check if agent stages are configured
            if (configContent.includes('["llm_1","llm_2","llm_3"]')) {
                console.log('✅ Three LLM stages configured correctly');
            } else {
                console.log('❌ Three LLM stages not found in config');
            }
            
            // Check if default model provider is set
            if (configContent.includes('MODEL_PROVIDER') || configContent.includes('openai')) {
                console.log('✅ Model provider configuration found');
            } else {
                console.log('❌ Model provider not configured');
            }
        }
        
        // Check if the LLM node directories were created
        const llmNodesDir = path.join(outputPath, 'src/nodes/llm');
        if (await fs.pathExists(llmNodesDir)) {
            const llmNodeDirs = await fs.readdir(llmNodesDir);
            const expectedLLMNodes = ['llm_1', 'llm_2', 'llm_3'];
            const foundLLMNodes = expectedLLMNodes.filter(node => llmNodeDirs.includes(node));
            
            if (foundLLMNodes.length === 3) {
                console.log('✅ All three LLM node directories created');
            } else {
                console.log(`❌ Expected 3 LLM node directories, found: ${foundLLMNodes.join(', ')}`);
            }
        }
        
        // Check if the tool node directories were created
        const toolNodesDir = path.join(outputPath, 'src/nodes/tools');
        if (await fs.pathExists(toolNodesDir)) {
            const toolNodeDirs = await fs.readdir(toolNodesDir);
            const expectedToolNodes = ['llm_1', 'llm_2', 'llm_3'];
            const foundToolNodes = expectedToolNodes.filter(node => toolNodeDirs.includes(node));
            
            if (foundToolNodes.length === 3) {
                console.log('✅ All three tool node directories created');
            } else {
                console.log(`❌ Expected 3 tool node directories, found: ${foundToolNodes.join(', ')}`);
            }
        }
        
        // Verify that the generated files have the correct structure
        const llm1ProcessorPath = path.join(outputPath, 'src/nodes/llm/llm_1/processor.py');
        if (await fs.pathExists(llm1ProcessorPath)) {
            const llm1Content = await fs.readFile(llm1ProcessorPath, 'utf8');
            if (llm1Content.includes('Llm_1LLMNode')) {
                console.log('✅ LLM node 1 processor generated correctly');
            } else {
                console.log('❌ LLM node 1 processor not generated correctly');
            }
        }
        
        const tool1ProcessorPath = path.join(outputPath, 'src/nodes/tools/llm_1/processor.py');
        if (await fs.pathExists(tool1ProcessorPath)) {
            const tool1Content = await fs.readFile(tool1ProcessorPath, 'utf8');
            if (tool1Content.includes('Llm_1ToolNode')) {
                console.log('✅ Tool node 1 processor generated correctly');
            } else {
                console.log('❌ Tool node 1 processor not generated correctly');
            }
        }
        
    } catch (error) {
        console.error(`❌ Error generating ${testConfig.name}:`, error.message);
    }

    console.log('\n🎉 Custom agent test completed!');
    console.log(`📂 Check the '${testDir}' directory for the generated project.`);
}

// Run the test
if (require.main === module) {
    testCustomAgent().catch(console.error);
}

module.exports = { testCustomAgent };
