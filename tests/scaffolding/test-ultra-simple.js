#!/usr/bin/env node
/**
 * Test script for ultra-simplified configuration (only project section required)
 */

const { ScaffoldingService } = require('../../src/scaffold');
const path = require('path');

async function testUltraSimple() {
    console.log('🧪 Testing Ultra-Simplified Configuration (Only Project Section Required)\n');

    // Test configurations with absolute minimum
    const testConfigs = [
        {
            name: 'Python Agent (Only Project)',
            config: {
                "project": {
                    "name": "Ultra Simple Python Agent",
                    "language": "python"
                }
                // Everything else will be auto-generated with defaults
            }
        },
        {
            name: 'TypeScript Agent (Only Project)',
            config: {
                "project": {
                    "name": "Ultra Simple TypeScript Agent", 
                    "language": "typescript"
                }
                // Everything else will be auto-generated with defaults
            }
        },
        {
            name: 'Python Agent with Node-Based Tools',
            config: {
                "project": {
                    "name": "Node Based Python Agent",
                    "language": "python"
                },
                "tools": [
                    {
                        "node_name": "retrieve",
                        "selected": ["web_search"]
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
        }
    ];

    const scaffold = new ScaffoldingService();
    const testDir = path.join(__dirname, 'test-ultra-simple-output');

    for (const test of testConfigs) {
        console.log(`\n📁 Testing: ${test.name}`);
        console.log('─'.repeat(60));
        
        try {
            const outputPath = path.join(testDir, test.config.project.name.toLowerCase().replace(/\s+/g, '-'));
            
            console.log(`Generating project at: ${outputPath}`);
            await scaffold.generateProject(test.config, outputPath);
            
            console.log(`✅ Successfully generated: ${test.name}`);
            
            // Check if defaults were applied correctly
            const fs = require('fs-extra');
            const configPath = path.join(outputPath, test.config.project.language === 'python' ? 'src/config.py' : 'src/config.js');
            
            if (await fs.pathExists(configPath)) {
                const configContent = await fs.readFile(configPath, 'utf8');
                
                // Check if stages were derived correctly
                if (configContent.includes('retrieve') && configContent.includes('reason') && configContent.includes('act')) {
                    console.log('✅ Stages correctly derived or defaulted');
                } else {
                    console.log('❌ Stages not derived correctly');
                }
                
                // Check framework default
                if (configContent.includes('langgraph')) {
                    console.log('✅ Framework correctly defaulted to langgraph');
                } else {
                    console.log('❌ Framework did not default to langgraph');
                }
                
                // Check runtime default
                const expectedRuntime = test.config.project.language === 'python' ? 'fastapi' : 'express';
                if (configContent.includes(expectedRuntime)) {
                    console.log(`✅ Runtime correctly defaulted to ${expectedRuntime}`);
                } else {
                    console.log(`❌ Runtime did not default to ${expectedRuntime}`);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error generating ${test.name}:`, error.message);
        }
    }

    console.log('\n🎉 Ultra-simplified configuration test completed!');
    console.log(`📂 Check the '${testDir}' directory for generated projects.`);
}

// Run the test
if (require.main === module) {
    testUltraSimple().catch(console.error);
}

module.exports = { testUltraSimple };
