#!/usr/bin/env node
/**
 * Test script for the scaffolding service
 */

const { ScaffoldingService } = require('./src/scaffold');
const path = require('path');

async function testScaffolding() {
    console.log('🧪 Testing Handit Agent Scaffolding Service\n');

    // Test configurations
    const testConfigs = [
        {
            name: 'Python LangGraph Agent',
            config: {
                "project": {
                    "name": "FAQ Bot",
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
                    "selected": ["http_fetch", "calculator"]
                },
                "model": {
                    "provider": "mock",
                    "name": "mock-llm"
                },
                "storage": {
                    "memory": "faiss-local",
                    "cache": "in-memory",
                    "sql": "sqlite"
                }
            }
        },
        {
            name: 'JavaScript LangChain Agent',
            config: {
                "project": {
                    "name": "Document Processor",
                    "language": "typescript",
                    "framework": "langchain"
                },
                "runtime": {
                    "type": "express",
                    "port": 3000
                },
                "orchestration": {
                    "style": "pipeline"
                },
                "agent": {
                    "stages": ["retrieve", "reason", "act"],
                    "subAgents": 1
                },
                "tools": {
                    "selected": ["web_search", "file_io", "code_run"]
                },
                "model": {
                    "provider": "ollama",
                    "name": "llama3.1"
                },
                "storage": {
                    "memory": "none",
                    "cache": "redis",
                    "sql": "none"
                }
            }
        },
        {
            name: 'Python Base Agent',
            config: {
                "project": {
                    "name": "Simple CLI Tool",
                    "language": "python",
                    "framework": "base"
                },
                "runtime": {
                    "type": "cli"
                },
                "orchestration": {
                    "style": "pipeline"
                },
                "agent": {
                    "stages": ["process"],
                    "subAgents": 0
                },
                "tools": {
                    "selected": ["calculator"]
                },
                "model": {
                    "provider": "mock",
                    "name": "mock-llm"
                },
                "storage": {
                    "memory": "none",
                    "cache": "in-memory",
                    "sql": "none"
                }
            }
        },
        {
            name: 'Multi-Model Agent',
            config: {
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
            }
        }
    ];

    const scaffold = new ScaffoldingService();
    const testDir = path.join(__dirname, 'test-output');

    for (const test of testConfigs) {
        console.log(`\n📁 Testing: ${test.name}`);
        console.log('─'.repeat(50));
        
        try {
            const outputPath = path.join(testDir, test.config.project.name.toLowerCase().replace(/\s+/g, '-'));
            
            console.log(`Generating project at: ${outputPath}`);
            await scaffold.generateProject(test.config, outputPath);
            
            console.log(`✅ Successfully generated: ${test.name}`);
            
        } catch (error) {
            console.error(`❌ Error generating ${test.name}:`, error.message);
        }
    }

    console.log('\n🎉 Scaffolding test completed!');
    console.log(`📂 Check the '${testDir}' directory for generated projects.`);
}

// Run the test
if (require.main === module) {
    testScaffolding().catch(console.error);
}

module.exports = { testScaffolding };
