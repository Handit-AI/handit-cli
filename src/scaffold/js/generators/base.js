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
    console.log('🟨 Generating base JavaScript project...');

    // Generate main application file
    await this.generateMainFile(config, targetPath);

    // Generate configuration file
    await this.generateConfigFile(config, targetPath);

    // Generate node files
    await this.generateNodes(config, targetPath);

    // Generate package.json
    await this.generatePackageJson(config, targetPath);

    // Generate utils
    await this.generateUtils(config, targetPath);

    console.log('✅ Base JavaScript project generated');
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

require('dotenv').config();
const { configure, startTracing, endTracing } = require('@handit.ai/handit-ai');

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

const Config = require('./src/config');
const { RetrieveLogic } = require('./src/nodes/retrieve/logic');
const { ReasonLogic } = require('./src/nodes/reason/logic');
const { ActLogic } = require('./src/nodes/act/logic');

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
            console.log(\`Executing stage: \${stage}\`);
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
 * Configuration management for ${config.project.name}
 */

/**
 * Configuration management class for ${config.project.name}
 * Handles both legacy single-model and new multi-model-per-node configurations
 */
class Config {
    /**
     * Initialize configuration with project settings and environment variables
     */
    constructor() {
        /** @type {string} Project name */
        this.projectName = '${config.project.name}';
        
        /** @type {string} Programming language */
        this.language = '${config.project.language}';
        
        /** @type {string} Framework used */
        this.framework = '${config.project.framework}';
        
        /** @type {string} Default LLM provider */
        this.defaultLlmProvider = '${config.project.default_llm_provider || 'mock'}';
        
        /** @type {string} Runtime type (fastapi, express, cli, worker) */
        this.runtimeType = '${config.runtime.type}';
        
        /** @type {number|null} Runtime port */
        this.runtimePort = ${config.runtime.port || 'null'};
        
        /** @type {string} Orchestration style */
        this.orchestrationStyle = '${config.orchestration.style}';
        
        /** @type {string[]} Agent stages */
        this.agentStages = ${JSON.stringify(config.agent.stages)};
        
        /** @type {number} Number of sub-agents */
        this.agentSubAgents = ${config.agent.subAgents};
        
        /** @type {string[]} Selected tools */
        this.toolsSelected = ${JSON.stringify(BaseJSGenerator.getToolsArray(config))};
        
        /** @type {Array<Object>} Tools nodes configuration (new structure) */
        this.toolsNodes = ${JSON.stringify(config.tools || [])};
        
        /** @type {Object} Default model configuration */
        this.model = {
            provider: '${config.model ? config.model.provider : 'mock'}',
            name: '${config.model ? config.model.name : 'mock-llm'}'
        };
        
        /** @type {Array<Object>} LLM nodes configuration (new structure) */
        this.llmNodes = ${JSON.stringify(config.llm_nodes || [])};
        
        /** @type {Object} Storage configuration */
        this.storage = {
            memory: '${config.storage.memory}',
            cache: '${config.storage.cache}',
            sql: '${config.storage.sql}'
        };
        
        // Environment variables
        this.handitApiKey = process.env.HANDIT_API_KEY;
        this.modelProvider = process.env.MODEL_PROVIDER || this.model.provider;
        this.modelName = process.env.MODEL_NAME || this.model.name;
        
        // Runtime configuration
        if (this.runtimeType === 'express') {
            this.port = parseInt(process.env.PORT || this.runtimePort || 3000);
        }
        
        // Storage configuration
        this.memoryStorage = process.env.MEMORY_STORAGE || this.storage.memory;
        this.cacheStorage = process.env.CACHE_STORAGE || this.storage.cache;
        this.sqlStorage = process.env.SQL_STORAGE || this.storage.sql;
    }
    
    getModelConfig() {
        /**
         * Get model configuration
         */
        return {
            provider: this.modelProvider,
            name: this.modelName
        };
    }
    
    getStorageConfig() {
        /**
         * Get storage configuration
         */
        return {
            memory: this.memoryStorage,
            cache: this.cacheStorage,
            sql: this.sqlStorage
        };
    }
    
    getToolsConfig() {
        /**
         * Get tools configuration
         */
        return {
            selected: this.toolsSelected
        };
    }
    
    getNodeModelConfig(nodeName) {
        /**
         * Get model configuration for a specific node.
         * 
         * @param {string} nodeName - Name of the node
         * @returns {object} Model configuration for the node
         */
        // Check if we have llmNodes configuration
        if (this.llmNodes && this.llmNodes.length > 0) {
            for (const llmNode of this.llmNodes) {
                if (llmNode.node_name === nodeName) {
                    return llmNode.model || {};
                }
            }
        }
        
        // Fallback to default model configuration
        return this.getModelConfig();
    }
    
    getNodeToolsConfig(nodeName) {
        /**
         * Get tools configuration for a specific node.
         * 
         * @param {string} nodeName - Name of the node
         * @returns {string[]} List of tools for the node
         */
        // Check if we have toolsNodes configuration (new structure)
        if (Array.isArray(this.toolsNodes) && this.toolsNodes.length > 0) {
            for (const toolNode of this.toolsNodes) {
                if (toolNode.node_name === nodeName) {
                    return toolNode.selected || [];
                }
            }
        }
        
        // Fallback to all tools (legacy structure)
        return this.toolsSelected;
    }
}

module.exports = Config;
`;

    await fs.writeFile(path.join(targetPath, 'src/config.js'), configContent);
  }

  /**
   * Generate node files for each stage
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateNodes(config, targetPath) {
    for (const stage of config.agent.stages) {
      await this.generateNodeFiles(config, targetPath, stage);
    }
  }

  /**
   * Generate files for a specific node
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} stage - Stage name
   */
  static async generateNodeFiles(config, targetPath, stage) {
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

const { Logger, setupLogging, getLogger } = require('./logger');

module.exports = { Logger, setupLogging, getLogger };
`;

    await fs.writeFile(path.join(utilsPath, 'index.js'), utilsIndexContent);
  }
}

module.exports = BaseJSGenerator;
