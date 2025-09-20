const fs = require('fs-extra');
const path = require('path');

/**
 * Base JavaScript generator for creating JavaScript/TypeScript agent projects
 */
class BaseJSGenerator {
  /**
   * Get tools array from config (handles both new and legacy structure)
   * @param {Object} config - Configuration object
   * @returns {Array} Array of tool names
   */
  static getToolsArray(config) {
    if (!config.tools) {
      return []; // No tools specified
    }
    
    if (Array.isArray(config.tools)) {
      // New structure: extract all tools from all nodes
      const allTools = new Set();
      for (const toolNode of config.tools) {
        if (toolNode.selected && Array.isArray(toolNode.selected)) {
          toolNode.selected.forEach(tool => allTools.add(tool));
        }
      }
      return Array.from(allTools);
    } else if (config.tools && config.tools.selected) {
      // Legacy structure
      return config.tools.selected;
    }
    return [];
  }

  /**
   * Generate a base JavaScript project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {

    // Generate main application file
    await this.generateMainFile(config, targetPath);

    // Generate base classes
    await this.generateBaseClasses(config, targetPath);

    // Generate configuration file
    await this.generateConfigFile(config, targetPath);

    // Generate agent file
    await this.generateAgentFile(config, targetPath);

    // Generate node files
    await this.generateNodes(config, targetPath);

    // Generate package.json
    await this.generatePackageJson(config, targetPath);

    // Generate utils
    await this.generateUtils(config, targetPath);

    // Generate use cases
    await this.generateUseCases(config, targetPath);

    // Generate use case runner
    await this.generateUseCaseRunner(config, targetPath);
  }

  /**
   * Generate main application file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env node
/**
 * Main application entry point for ${config.project.name}
 */

import dotenv from 'dotenv';
dotenv.config();
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

import Config from './src/config.js';
import { RetrieveLogic } from './src/nodes/retrieve/logic.js';
import { ReasonLogic } from './src/nodes/reason/logic.js';
import { ActLogic } from './src/nodes/act/logic.js';

class AgentPipeline {
    constructor() {
        this.config = new Config();
        this.nodes = {
            retrieve: new RetrieveLogic(this.config),
            reason: new ReasonLogic(this.config),
            act: new ActLogic(this.config)
        };
    }
    
    async process(inputData) {
        /**
         * Process input through the agent pipeline
         */
        let result = inputData;
        
        // Execute each stage in sequence
        for (const stage of this.config.agentStages) {
            result = await this.nodes[stage].execute(result);
        }
        
        return result;
    }
}

async function main() {
    /**
     * Main application entry point
     */
    try {
        console.log(\`Starting ${config.project.name}...\`);
        
        // Initialize agent
        const agent = new AgentPipeline();
        
        // Example usage
        if ('${config.runtime.type}' === 'cli') {
            // CLI mode
            const inputData = process.argv[2] || await getUserInput();
            startTracing({ agent: '${config.project.name}' });
            try {
                const result = await agent.process(inputData);
                console.log(\`Result: \${result}\`);
            } finally {
                endTracing();
            }
        } else if ('${config.runtime.type}' === 'worker') {
            // Worker mode - implement queue processing
            console.log('Worker mode - implement your queue processing logic here');
            // TODO: Add queue processing logic
        } else {
            // Default mode
            console.log('Running in default mode');
            startTracing({ agent: '${config.project.name}' });
            try {
                const result = await agent.process('Hello, world!');
                console.log(\`Result: \${result}\`);
            } finally {
                endTracing();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

function getUserInput() {
    return new Promise((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('Enter input: ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AgentPipeline };
`;

    await fs.writeFile(path.join(targetPath, 'main.js'), mainContent);
  }

  /**
   * Generate configuration file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateConfigFile(config, targetPath) {
    const configContent = `/**
 * Simple configuration for ${config.project.name}
 * Only includes what's actually needed for the agent to run.
 */

class Config {
    /**
     * Simple configuration class - only essential properties.
     * The generator handles folder/file structure based on JSON config.
     */
    
    constructor() {
        // Basic project info
        this.project_name = '${config.project.name}';
        this.framework = '${config.framework || 'langgraph'}';
        
        // Runtime info
        this.runtime_type = '${config.runtime?.type || 'express'}';
        this.port = ${config.runtime?.port || 3000};
        
        // Agent stages (the actual workflow)
        this.agent_stages = ${JSON.stringify(config.agent?.stages || [])};
        
        // Environment variables (for actual runtime configuration)
        this.handit_api_key = process.env.HANDIT_API_KEY;
        this.model_provider = process.env.MODEL_PROVIDER || 'mock';
        this.model_name = process.env.MODEL_NAME || 'mock-llm';
    }
    
    getModelConfig(nodeName = null) {
        /**
         * Get model configuration for a node.
         * 
         * @param {string} nodeName - Optional node name for node-specific config
         * @returns {object} Model configuration
         */
        return {
            provider: this.model_provider,
            name: this.model_name
        };
    }
    
    getNodeToolsConfig(nodeName) {
        /**
         * Get tools for a specific node.
         * 
         * @param {string} nodeName - Name of the node
         * @returns {string[]} List of available tools (empty for now - implement as needed)
         */
        // Return empty list by default - tools can be added per node as needed
        return [];
    }
}

export default Config;
`;

    await fs.writeFile(path.join(targetPath, 'src/config.js'), configContent);
  }

  /**
   * Generate node files for each stage
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateNodes(config, targetPath) {
    // Create node directories structure like Python
    const nodesPath = path.join(targetPath, 'src/nodes');
    await fs.ensureDir(path.join(nodesPath, 'llm'));
    await fs.ensureDir(path.join(nodesPath, 'tools'));

    // Create index.js files (equivalent to __init__.py)
    await fs.writeFile(path.join(nodesPath, 'index.js'), '// Node exports');
    await fs.writeFile(path.join(nodesPath, 'llm/index.js'), '// LLM node exports');
    await fs.writeFile(path.join(nodesPath, 'tools/index.js'), '// Tool node exports');

    // Generate LLM nodes
    if (config.llm_nodes) {
      for (const llmNode of config.llm_nodes) {
        await this.generateLLMNodeFiles(config, targetPath, llmNode.node_name);
      }
    }

    // Generate Tool nodes
    if (config.tools) {
      for (const toolNode of config.tools) {
        await this.generateToolNodeFiles(config, targetPath, toolNode.node_name);
      }
    }
  }

  /**
   * Generate files for a specific node (LEGACY - NOT USED)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} stage - Stage name
   */
  static async generateNodeFiles_LEGACY_NOT_USED(config, targetPath, stage) {
    const nodePath = path.join(targetPath, 'src/nodes', stage);
    
    // Generate README.md
    await this.generateNodeReadme(config, stage, nodePath);
    
    // Generate logic.js
    const logicContent = `/**
 * ${stage.charAt(0).toUpperCase() + stage.slice(1)} node logic
 */

const { startTracing, endTracing } = require('@handit.ai/handit-ai');
const { getPrompts } = require('./prompts');

class ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic {
    constructor(config) {
        this.config = config;
        this.prompts = getPrompts();
        this.stage = '${stage}';
    }
    
    async execute(inputData) {
        /**
         * Main execution logic for the ${stage} node.
         * 
         * @param {any} inputData - Input data from previous stage or initial input
         * @returns {any} Processed data for next stage
         */
        try {
            // TODO: Implement your ${stage} logic here
            const result = await this.processInput(inputData);
            return result;
        } catch (error) {
            console.error(\`Error in \${this.stage} node:\`, error);
            throw error;
        }
    }
    
    async processInput(data) {
        /**
         * Process the input data for this stage.
         * 
         * Customize this method with your specific ${stage} logic.
         */
        // TODO: Implement your processing logic
        // Example implementation:
        
        // Get the appropriate prompt
        const prompt = this.prompts.system || 'Default prompt';
        
        // Process the data (customize this)
        if (typeof data === 'string') {
            // Handle string input
            return \`Processed by \${this.stage}: \${data}\`;
        } else if (typeof data === 'object' && data !== null) {
            // Handle object input
            return { ...data, [\`\${this.stage}_processed\`]: true };
        } else {
            // Handle other types
            return { processedBy: this.stage, data: data };
        }
    }
    
    validateInput(data) {
        /**
         * Validate input data for this stage.
         * 
         * @returns {boolean} True if input is valid, False otherwise
         */
        // TODO: Implement input validation
        return data !== null && data !== undefined;
    }
    
    getMetadata() {
        /**
         * Get metadata about this node.
         * 
         * @returns {object} Dictionary containing node metadata
         */
        return {
            stage: this.stage,
            config: this.config.getModelConfig(),
            tools: this.config.getToolsConfig()
        };
    }
}

module.exports = { ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic };
`;

    await fs.writeFile(path.join(nodePath, 'logic.js'), logicContent);

    // Generate prompts.js
    const promptsContent = `/**
 * Prompt definitions for the ${stage} node
 */

function getPrompts() {
    /**
     * Define prompts for the ${stage} node.
     * 
     * Customize these prompts for your specific use case.
     * 
     * @returns {object} Dictionary containing prompt templates and examples
     */
    return {
        system: \`You are a helpful AI assistant specialized in ${stage} tasks.

Your role is to:
- Process input data for the ${stage} stage
- Apply appropriate ${stage} logic
- Return structured results for the next stage

Guidelines:
- Be precise and focused on ${stage} functionality
- Maintain consistency with the overall agent workflow
- Handle errors gracefully
- Provide clear, actionable outputs\`,

        userTemplate: \`Process the following input for the ${stage} stage:

Input: {input}

Context: {context}

Please provide a structured response that can be used by the next stage in the pipeline.\`,

        examples: [
            {
                input: \`Sample input for ${stage}\`,
                output: \`Sample output from ${stage}\`,
                context: 'Example context'
            }
        ],
        
        errorHandling: {
            invalidInput: \`The input provided is not valid for ${stage} processing.\`,
            processingError: \`An error occurred while processing the input in ${stage}.\`,
            timeout: \`The ${stage} processing timed out.\`
        },
        
        validationRules: {
            requiredFields: ['input'],
            optionalFields: ['context', 'metadata'],
            inputTypes: ['string', 'object', 'array']
        }
    };
}

function getStageSpecificPrompts(stageType) {
    /**
     * Get stage-specific prompts based on the stage type.
     * 
     * @param {string} stageType - Type of stage (retrieve, reason, act, etc.)
     * @returns {object} Stage-specific prompt configuration
     */
    const stagePrompts = {
        retrieve: {
            description: 'Retrieve relevant information from available sources',
            focus: 'Information gathering and data retrieval',
            outputFormat: 'Structured data with retrieved information'
        },
        reason: {
            description: 'Analyze and reason about the retrieved information',
            focus: 'Logical analysis and decision making',
            outputFormat: 'Analysis results and reasoning chain'
        },
        act: {
            description: 'Execute actions based on reasoning results',
            focus: 'Action execution and result generation',
            outputFormat: 'Action results and final output'
        }
    };
    
    return stagePrompts[stageType] || {
        description: \`Process data for \${stageType} stage\`,
        focus: 'Data processing and transformation',
        outputFormat: 'Processed data for next stage'
    };
}

function formatPrompt(template, variables = {}) {
    /**
     * Format a prompt template with provided variables.
     * 
     * @param {string} template - Prompt template string
     * @param {object} variables - Variables to substitute in the template
     * @returns {string} Formatted prompt string
     */
    try {
        return template.replace(/\\{([^}]+)\\}/g, (match, key) => {
            if (variables.hasOwnProperty(key)) {
                return variables[key];
            }
            throw new Error(\`Missing required variable: \${key}\`);
        });
    } catch (error) {
        throw new Error(\`Prompt formatting error: \${error.message}\`);
    }
}

module.exports = { 
    getPrompts, 
    getStageSpecificPrompts, 
    formatPrompt 
};
`;

    await fs.writeFile(path.join(nodePath, 'prompts.js'), promptsContent);

    // Generate index.js
    const indexContent = `/**
 * ${stage.charAt(0).toUpperCase() + stage.slice(1)} node package
 */

const { ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic } = require('./logic');
const { getPrompts, getStageSpecificPrompts, formatPrompt } = require('./prompts');

module.exports = {
    ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic,
    getPrompts,
    getStageSpecificPrompts,
    formatPrompt
};
`;

    await fs.writeFile(path.join(nodePath, 'index.js'), indexContent);
  }

  /**
   * Generate README.md for a specific node
   * @param {Object} config - Configuration object
   * @param {string} stage - Stage name
   * @param {string} nodePath - Node directory path
   */
  static async generateNodeReadme(config, stage, nodePath) {
    const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1);
    const readmeContent = `# ${stageCapitalized} Node

This folder contains the implementation for the **${stage}** stage of the ${config.project.name} agent.

## Files

- **\`logic.js\`** - Contains the main execution logic for this node
- **\`prompts.js\`** - Contains prompt definitions and templates
- **\`index.js\`** - Exports the node components

## Purpose

The ${stage} node is responsible for:

${this.getNodeDescription(stage)}

## Usage

\`\`\`javascript
const { ${stageCapitalized}Logic } = require('./logic');

// Initialize the node
const node = new ${stageCapitalized}Logic(config);

// Execute the node
const result = await node.execute(inputData);
\`\`\`

## Configuration

This node uses the following configuration:
- **Model**: ${config.model ? `${config.model.provider}/${config.model.name}` : 'Multiple models per node'}
- **Tools**: ${Array.isArray(config.tools) ? 'Node-specific tools' : (config.tools && config.tools.selected ? config.tools.selected.join(', ') : 'No tools specified')}
- **Storage**: ${config.storage.memory}/${config.storage.cache}/${config.storage.sql}

## Customization

To customize this node:

1. **Modify Logic**: Edit \`logic.js\` to change the execution behavior
2. **Update Prompts**: Edit \`prompts.js\` to modify prompt templates
3. **Add Tools**: Extend the tools configuration in the main config
4. **Change Model**: Update the model configuration for this specific node

## Handit Integration

This node is automatically traced by Handit.ai for monitoring and observability.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Get description for a specific node stage
   * @param {string} stage - Stage name
   * @returns {string} Description of the stage
   */
  static getNodeDescription(stage) {
    const descriptions = {
      'retrieve': '- Retrieving relevant information from data sources\n- Searching knowledge bases and databases\n- Gathering context for the reasoning stage',
      'reason': '- Analyzing retrieved information\n- Making logical inferences and connections\n- Determining the best course of action\n- Processing complex reasoning tasks',
      'act': '- Executing actions based on reasoning\n- Generating responses or outputs\n- Performing final processing steps\n- Delivering results to the user',
      'process': '- Processing input data\n- Transforming and analyzing information\n- Preparing data for further stages\n- Handling data validation and cleaning'
    };
    
    return descriptions[stage] || '- Processing data and executing logic\n- Implementing the core functionality\n- Handling input/output operations';
  }

  /**
   * Generate package.json
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generatePackageJson(config, targetPath) {
    const packageJson = {
      name: config.project.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `Handit-powered AI agent: ${config.project.name}`,
      type: 'module',
      main: 'main.js',
      scripts: {
        start: 'node main.js',
        dev: 'nodemon main.js',
        test: 'jest',
        lint: 'eslint src/',
        'lint:fix': 'eslint src/ --fix'
      },
      dependencies: {
        '@handit.ai/handit-ai': '^1.0.0',
        'dotenv': '^16.0.0',
        'joi': '^17.0.0'
      },
      devDependencies: {
        'jest': '^29.0.0',
        'eslint': '^8.0.0',
        'nodemon': '^2.0.0'
      },
      engines: {
        node: '>=16.0.0'
      },
      keywords: [
        'ai',
        'agent',
        'handit',
        config.project.framework,
        config.project.language
      ],
      author: 'Handit Team',
      license: 'MIT'
    };

    // Add runtime-specific dependencies
    if (config.runtime.type === 'express') {
      packageJson.dependencies.express = '^4.18.0';
      packageJson.dependencies.cors = '^2.8.5';
      packageJson.dependencies.helmet = '^7.0.0';
    }

    // Add storage-specific dependencies
    if (config.storage.cache === 'redis') {
      packageJson.dependencies.redis = '^4.6.0';
      packageJson.dependencies.ioredis = '^5.3.0';
    }

    if (config.storage.sql === 'sqlite') {
      packageJson.dependencies.sqlite3 = '^5.1.0';
      packageJson.dependencies.knex = '^2.5.0';
    }

    await fs.writeFile(path.join(targetPath, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  /**
   * Generate utility files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateUtils(config, targetPath) {
    const utilsPath = path.join(targetPath, 'src/utils');
    await fs.ensureDir(utilsPath);

    // Generate logger.js
    const loggerContent = `/**
 * Logging configuration for ${config.project.name}
 */

const winston = require('winston');

class Logger {
    constructor(level = 'info', logFile = null) {
        this.logger = winston.createLogger({
            level: level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: '${config.project.name}' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
        
        if (logFile) {
            this.logger.add(new winston.transports.File({ filename: logFile }));
        }
    }
    
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }
    
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }
    
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
    
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
}

function setupLogging(level = 'info', logFile = null) {
    /**
     * Set up logging configuration.
     * 
     * @param {string} level - Logging level (debug, info, warn, error)
     * @param {string} logFile - Optional log file path
     * @returns {Logger} Configured logger instance
     */
    return new Logger(level, logFile);
}

function getLogger(name) {
    /**
     * Get a logger instance for a specific module.
     * 
     * @param {string} name - Logger name (usually __filename)
     * @returns {Logger} Logger instance
     */
    return new Logger();
}

module.exports = { Logger, setupLogging, getLogger };
`;

    await fs.writeFile(path.join(utilsPath, 'logger.js'), loggerContent);

    // Generate index.js for utils
    const utilsIndexContent = `/**
 * Utility functions for ${config.project.name}
 */

export { Logger, setupLogging, getLogger } from './logger.js';
export { UseCaseExecutor } from './use_case_executor.js';
`;

    await fs.writeFile(path.join(utilsPath, 'index.js'), utilsIndexContent);

    // Generate use case executor
    await this.generateUseCaseExecutor(config, targetPath);
  }

  /**
   * Generate use case executor
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateUseCaseExecutor(config, targetPath) {
    const utilsPath = path.join(targetPath, 'src/utils');
    
    const executorContent = `/**
 * Use Case Executor for ${config.project.name}
 * Executes use cases defined in JSON format against the agent
 */

import fs from 'fs-extra';
import path from 'path';
import Config from '../config.js';
import { LangGraphAgent } from '../agent.js';

export class UseCaseExecutor {
  constructor(config = null) {
    this.config = config || new Config();
    this.agent = null;
    this.results = [];
  }

  async loadAgent() {
    if (this.agent === null) {
      this.agent = new LangGraphAgent(this.config);
    }
  }

  async executeUseCase(useCase) {
    try {
      console.log(\`\\n🧪 Running use case: \${useCase.name}\`);
      console.log(\`📝 Description: \${useCase.description}\`);
      
      const startTime = Date.now();
      const result = await this.agent.process(useCase.input);
      const endTime = Date.now();
      
      const executionResult = {
        useCase: useCase.name,
        description: useCase.description,
        input: useCase.input,
        output: result,
        executionTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
      this.results.push(executionResult);
      
      console.log(\`✅ Use case completed in \${executionResult.executionTime}ms\`);
      
      return executionResult;
    } catch (error) {
      console.error(\`❌ Error executing use case \${useCase.name}:\`, error.message);
      
      const executionResult = {
        useCase: useCase.name,
        description: useCase.description,
        input: useCase.input,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      
      this.results.push(executionResult);
      return executionResult;
    }
  }

  async executeUseCasesFromFile(filePath) {
    try {
      const useCaseData = await fs.readJson(filePath);
      
      if (!useCaseData.use_cases || !Array.isArray(useCaseData.use_cases)) {
        console.error(\`Invalid use case file format: \${filePath}\`);
        return;
      }
      
      console.log(\`\\n📋 Processing \${useCaseData.use_cases.length} use cases from \${path.basename(filePath)}\`);
      
      for (const useCase of useCaseData.use_cases) {
        await this.executeUseCase(useCase);
      }
      
    } catch (error) {
      console.error(\`Error reading use case file \${filePath}:\`, error.message);
    }
  }

  generateReport() {
    const totalUseCases = this.results.length;
    const successfulUseCases = this.results.filter(r => r.status === 'success').length;
    const failedUseCases = this.results.filter(r => r.status === 'error').length;
    
    const totalExecutionTime = this.results
      .filter(r => r.executionTime)
      .reduce((sum, r) => sum + r.executionTime, 0);
    
    return {
      summary: {
        total: totalUseCases,
        successful: successfulUseCases,
        failed: failedUseCases,
        successRate: totalUseCases > 0 ? (successfulUseCases / totalUseCases * 100).toFixed(2) : 0,
        totalExecutionTime: totalExecutionTime,
        averageExecutionTime: totalUseCases > 0 ? (totalExecutionTime / totalUseCases).toFixed(2) : 0
      },
      results: this.results
    };
  }

  printReport() {
    const report = this.generateReport();
    
    console.log(\`\\n📊 Use Case Execution Report\`);
    console.log(\`═\`.repeat(50));
    console.log(\`📈 Summary:\`);
    console.log(\`  Total use cases: \${report.summary.total}\`);
    console.log(\`  Successful: \${report.summary.successful}\`);
    console.log(\`  Failed: \${report.summary.failed}\`);
    console.log(\`  Success rate: \${report.summary.successRate}%\`);
    console.log(\`  Total execution time: \${report.summary.totalExecutionTime}ms\`);
    console.log(\`  Average execution time: \${report.summary.averageExecutionTime}ms\`);
    
    if (report.summary.failed > 0) {
      console.log(\`\\n❌ Failed use cases:\`);
      report.results
        .filter(r => r.status === 'error')
        .forEach(result => {
          console.log(\`  - \${result.useCase}: \${result.error}\`);
        });
    }
  }
}`;

    await fs.writeFile(path.join(utilsPath, 'use_case_executor.js'), executorContent);
  }

  /**
   * Generate base classes (equivalent to base.py)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateBaseClasses(config, targetPath) {
    const baseContent = `/**
 * Base classes for LLM and Tool nodes
 */

import Config from './config.js';

/**
 * Base class for LLM nodes
 */
export class BaseLLMNode {
  constructor(nodeName, config = null) {
    this.node_name = nodeName;
    this.config = config || new Config();
  }

  async process(inputData) {
    throw new Error('process method must be implemented by subclass');
  }

  async _execute_llm_logic(inputData) {
    throw new Error('_execute_llm_logic method must be implemented by subclass');
  }
}

/**
 * Base class for Tool nodes
 */
export class BaseToolNode {
  constructor(nodeName, config = null) {
    this.node_name = nodeName;
    this.config = config || new Config();
  }

  async process(inputData) {
    throw new Error('process method must be implemented by subclass');
  }

  async _execute_tool_logic(inputData) {
    throw new Error('_execute_tool_logic method must be implemented by subclass');
  }
}`;

    await fs.writeFile(path.join(targetPath, 'src/base.js'), baseContent);
  }

  /**
   * Generate agent file (equivalent to agent.py)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateAgentFile(config, targetPath) {
    const agentContent = `/**
 * Main agent class for ${config.project.name}
 */

import Config from './config.js';

/**
 * Main agent class
 */
export class LangGraphAgent {
  constructor(config = null) {
    this.config = config || new Config();
  }

  async process(inputData) {
    // This will be implemented by the framework-specific generator
    throw new Error('process method must be implemented by framework-specific generator');
  }
}`;

    await fs.writeFile(path.join(targetPath, 'src/agent.js'), agentContent);
  }

  /**
   * Generate LLM node files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} nodeName - Node name
   */
  static async generateLLMNodeFiles(config, targetPath, nodeName) {
    const nodePath = path.join(targetPath, 'src/nodes/llm', nodeName);
    await fs.ensureDir(nodePath);

    // Create index.js
    await fs.writeFile(path.join(nodePath, 'index.js'), '// LLM node exports');

    // Create processor.js (equivalent to processor.py)
    const processorContent = `/**
 * ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} LLM node processor
 */

import { BaseLLMNode } from '../../../base.js';
import { getPrompts } from './prompts.js';

export class ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}LLMNode extends BaseLLMNode {
  constructor(config = null) {
    super('${nodeName}', config);
  }

  async process(inputData) {
    try {
      // Execute with timeout (longer for LLM calls)
      const result = await Promise.race([
        this._execute_${nodeName.replace('-', '_').replace(' ', '_')}_llm_logic(inputData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout in ${nodeName} after 60 seconds')), 60000)
        )
      ]);

      return {
        node: this.node_name,
        status: 'success',
        result: result
      };
    } catch (error) {
      console.error(\`Error in \${this.node_name}:\`, error.message);
      throw error;
    }
  }

  async _execute_${nodeName.replace('-', '_').replace(' ', '_')}_llm_logic(inputData) {
    // Implement your LLM logic here
    const prompts = getPrompts();
    
    // Example implementation
    return {
      message: \`Processing in \${this.node_name} with input: \${JSON.stringify(inputData)}\`,
      prompts: prompts
    };
  }
}`;

    await fs.writeFile(path.join(nodePath, 'processor.js'), processorContent);

    // Create prompts.js
    const promptsContent = `/**
 * Prompts for ${nodeName} LLM node
 */

export function getPrompts() {
  return {
    system: "You are a helpful AI assistant in the ${nodeName} node.",
    user: "Please process the following input:",
    examples: []
  };
}`;

    await fs.writeFile(path.join(nodePath, 'prompts.js'), promptsContent);

    // Create README.md
    const readmeContent = `# ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} LLM Node

This node handles LLM processing for ${nodeName}.

## Files

- \`processor.js\`: Main node logic
- \`prompts.js\`: Prompt definitions
- \`index.js\`: Module exports

## Customization

Edit \`processor.js\` to implement your specific LLM logic.
Edit \`prompts.js\` to customize the prompts used by this node.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Generate Tool node files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} nodeName - Node name
   */
  static async generateToolNodeFiles(config, targetPath, nodeName) {
    const nodePath = path.join(targetPath, 'src/nodes/tools', nodeName);
    await fs.ensureDir(nodePath);

    // Create index.js
    await fs.writeFile(path.join(nodePath, 'index.js'), '// LLM node exports');

    // Create processor.js (equivalent to processor.py)
    const processorContent = `/**
 * ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} tool node processor
 */

import { BaseToolNode } from '../../../base.js';

export class ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}ToolNode extends BaseToolNode {
  constructor(config = null) {
    super('${nodeName}', config);
  }

  async process(inputData) {
    try {
      // Execute tool logic (no timeout for tools)
      const result = await this._execute_${nodeName.replace('-', '_').replace(' ', '_')}_tool_logic(inputData);

      return {
        node: this.node_name,
        status: 'success',
        result: result
      };
    } catch (error) {
      console.error(\`Error in \${this.node_name}:\`, error.message);
      throw error;
    }
  }

  async _execute_${nodeName.replace('-', '_').replace(' ', '_')}_tool_logic(inputData) {
    // Implement your tool logic here
    
    // Example implementation
    return {
      message: \`Tool executed in \${this.node_name} with input: \${JSON.stringify(inputData)}\`,
      timestamp: new Date().toISOString()
    };
  }
}`;

    await fs.writeFile(path.join(nodePath, 'processor.js'), processorContent);

    // Create README.md
    const readmeContent = `# ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} Tool Node

This node handles tool execution for ${nodeName}.

## Files

- \`processor.js\`: Main tool logic
- \`index.js\`: Module exports

## Customization

Edit \`processor.js\` to implement your specific tool logic.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Generate use cases
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateUseCases(config, targetPath) {
    const useCasesPath = path.join(targetPath, 'use_cases');
    await fs.ensureDir(useCasesPath);

    const exampleUseCases = {
      "metadata": {
        "name": "Example Use Cases",
        "description": "Sample use cases to demonstrate the agent's capabilities",
        "version": "1.0.0",
        "author": "Agent Developer",
        "created_at": new Date().toISOString()
      },
      "use_cases": [
        {
          "name": "Basic Information Request",
          "description": "Test basic information retrieval capabilities",
          "input": {
            "query": "What is the capital of France?",
            "context": "geography"
          }
        }
      ]
    };

    await fs.writeFile(
      path.join(useCasesPath, 'example_use_cases.json'),
      JSON.stringify(exampleUseCases, null, 2)
    );
  }

  /**
   * Generate use case runner
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateUseCaseRunner(config, targetPath) {
    const runnerContent = `#!/usr/bin/env node
/**
 * Use Case Runner for ${config.project.name}
 * Executes use cases defined in JSON files
 */

import fs from 'fs-extra';
import path from 'path';
import { UseCaseExecutor } from './src/utils/use_case_executor.js';

async function findUseCaseFiles(directory) {
  const files = [];
  
  if (await fs.pathExists(directory)) {
    const items = await fs.readdir(directory);
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await findUseCaseFiles(fullPath));
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function listUseCaseFiles() {
  const useCaseFiles = await findUseCaseFiles('./use_cases');
  
  if (useCaseFiles.length === 0) {
    console.log('No use case files found in ./use_cases directory');
    return;
  }
  
  console.log('Found use case files:');
  useCaseFiles.forEach(file => console.log(\`  - \${file}\`));
}

async function runUseCases() {
  const useCaseFiles = await findUseCaseFiles('./use_cases');
  
  if (useCaseFiles.length === 0) {
    console.log('No use case files found');
    return;
  }
  
  const executor = new UseCaseExecutor();
  await executor.loadAgent();
  
  for (const file of useCaseFiles) {
    console.log(\`\\nRunning use cases from: \${file}\`);
    await executor.executeUseCasesFromFile(file);
  }
  
  executor.printReport();
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list') || args.includes('-l')) {
    await listUseCaseFiles();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('Use Case Runner');
    console.log('Usage: node run_use_cases.js [options]');
    console.log('Options:');
    console.log('  --list, -l    List available use case files');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Without options, runs all use cases found in ./use_cases directory');
  } else {
    await runUseCases();
  }
}

// Check if this file is being run directly
if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(console.error);
}

export { findUseCaseFiles, listUseCaseFiles, runUseCases };`;

    await fs.writeFile(path.join(targetPath, 'run_use_cases.js'), runnerContent);
  }
}

module.exports = BaseJSGenerator;
