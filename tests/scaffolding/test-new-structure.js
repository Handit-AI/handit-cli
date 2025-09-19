#!/usr/bin/env node
/**
 * Test script for new node-based structure (tools and llm_nodes as arrays)
 */

const { ScaffoldingService } = require('../../src/scaffold');
const path = require('path');

async function testNewStructure() {
    console.log('🧪 Testing New Node-Based Structure (Tools & LLM Nodes as Arrays)\n');

    // Test configurations with new node-based structure
    const testConfigs = [
        {
            name: 'Python Agent (New Structure)',
            config: {
                "project": {
                    "name": "New Structure Python Agent",
                    "language": "python",
                    "default_llm_provider": "ollama"
                },
                "agent": {
                    "stages": ["retrieve", "reason", "act"],
                    "subAgents": 0
                },
                "tools": [
                    {
                        "node_name": "retrieve",
                        "selected": ["web_search", "http_fetch"]
                    },
                    {
                        "node_name": "reason",
                        "selected": ["calculator"]
                    },
                    {
                        "node_name": "act",
                        "selected": ["http_fetch"]
                    }
                ],
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
                ]
            }
        },
        {
            name: 'TypeScript Agent (New Structure)',
            config: {
                "project": {
                    "name": "New Structure TypeScript Agent",
                    "language": "typescript",
                    "default_llm_provider": "openai"
                },
                "agent": {
                    "stages": ["retrieve", "reason", "act"],
                    "subAgents": 0
                },
                "tools": [
                    {
                        "node_name": "retrieve",
                        "selected": ["web_search"]
                    },
                    {
                        "node_name": "reason",
                        "selected": ["calculator", "file_io"]
                    },
                    {
                        "node_name": "act",
                        "selected": ["code_run"]
                    }
                ],
                "llm_nodes": [
                    {
                        "node_name": "retrieve",
                        "model": {
                            "provider": "openai",
                            "name": "gpt-3.5-turbo"
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
                            "provider": "ollama",
                            "name": "llama3.1"
                        }
                    }
                ]
            }
        }
    ];

    const scaffold = new ScaffoldingService();
    const testDir = path.join(__dirname, 'test-new-structure-output');

    for (const test of testConfigs) {
        console.log(`\n📁 Testing: ${test.name}`);
        console.log('─'.repeat(60));
        
        try {
            const outputPath = path.join(testDir, test.config.project.name.toLowerCase().replace(/\s+/g, '-'));
            
            console.log(`Generating project at: ${outputPath}`);
            await scaffold.generateProject(test.config, outputPath);
            
            console.log(`✅ Successfully generated: ${test.name}`);
            
            // Check if the new structure was applied correctly
            const fs = require('fs-extra');
            const configPath = path.join(outputPath, test.config.project.language === 'python' ? 'src/config.py' : 'src/config.js');
            
            if (await fs.pathExists(configPath)) {
                const configContent = await fs.readFile(configPath, 'utf8');
                
                // Check if tools_nodes/toolsNodes configuration is present
                const toolsField = test.config.project.language === 'python' ? 'tools_nodes' : 'toolsNodes';
                if (configContent.includes(toolsField)) {
                    console.log('✅ New tools structure found in config');
                } else {
                    console.log('❌ New tools structure not found in config');
                }
                
                // Check if llm_nodes/llmNodes configuration is present
                const llmField = test.config.project.language === 'python' ? 'llm_nodes' : 'llmNodes';
                if (configContent.includes(llmField)) {
                    console.log('✅ LLM nodes structure found in config');
                } else {
                    console.log('❌ LLM nodes structure not found in config');
                }
                
                // Check if storage defaults were applied
                if (configContent.includes('none') && configContent.includes('in-memory')) {
                    console.log('✅ Storage defaults correctly applied');
                } else {
                    console.log('❌ Storage defaults not applied correctly');
                }
            }
            
        } catch (error) {
            console.error(`❌ Error generating ${test.name}:`, error.message);
        }
    }

    console.log('\n🎉 New structure test completed!');
    console.log(`📂 Check the '${testDir}' directory for generated projects.`);
}

// Run the test
if (require.main === module) {
    testNewStructure().catch(console.error);
}

module.exports = { testNewStructure };
