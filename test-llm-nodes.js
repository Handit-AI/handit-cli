#!/usr/bin/env node
/**
 * Test script for the new llm_nodes structure
 */

const { ScaffoldingService } = require('./src/scaffold');
const path = require('path');

async function testLLMNodes() {
    console.log('🧪 Testing Handit Agent Scaffolding Service with LLM Nodes\n');

    // Test configuration with new llm_nodes structure
    const config = {
        "project": {
            "name": "Multi-Model Agent",
            "language": "python",
            "framework": "langgraph"
        },
        "runtime": {
            "type": "fastapi",
            "port": 8000
        },
        "orchestration": {
            "style": "state-graph"
        },
        "agent": {
            "stages": ["retrieve", "reason", "act"],
            "subAgents": 0
        },
        "tools": {
            "selected": ["http_fetch", "calculator", "web_search"]
        },
        "llm_nodes": [
            {
                "node_name": "retrieve",
                "model": {
                    "provider": "ollama",
                    "name": "llama3.1"
                }
            },
            {
                "node_name": "reason",
                "model": {
                    "provider": "openai",
                    "name": "gpt-4"
                }
            },
            {
                "node_name": "act",
                "model": {
                    "provider": "mock",
                    "name": "mock-llm"
                }
            }
        ],
        "storage": {
            "memory": "faiss-local",
            "cache": "redis",
            "sql": "sqlite"
        }
    };

    const scaffold = new ScaffoldingService();
    const testDir = path.join(__dirname, 'test-llm-nodes-output');

    try {
        console.log('📁 Testing: Multi-Model Agent with LLM Nodes');
        console.log('─'.repeat(50));
        
        const outputPath = path.join(testDir, config.project.name.toLowerCase().replace(/\s+/g, '-'));
        
        console.log(`Generating project at: ${outputPath}`);
        await scaffold.generateProject(config, outputPath);
        
        console.log(`✅ Successfully generated: Multi-Model Agent`);
        
        // Check if the generated files contain the llm_nodes configuration
        const fs = require('fs-extra');
        const configPath = path.join(outputPath, 'src/config.py');
        
        if (await fs.pathExists(configPath)) {
            const configContent = await fs.readFile(configPath, 'utf8');
            if (configContent.includes('llm_nodes')) {
                console.log('✅ LLM nodes configuration found in generated config');
            } else {
                console.log('❌ LLM nodes configuration not found in generated config');
            }
        }
        
    } catch (error) {
        console.error(`❌ Error generating Multi-Model Agent:`, error.message);
    }

    console.log('\n🎉 LLM Nodes test completed!');
    console.log(`📂 Check the '${testDir}' directory for generated project.`);
}

// Run the test
if (require.main === module) {
    testLLMNodes().catch(console.error);
}

module.exports = { testLLMNodes };
