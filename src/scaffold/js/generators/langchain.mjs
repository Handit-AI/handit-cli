const fs = require('fs-extra');
const path = require('path');
const BaseJSGenerator = require('./base');

/**
 * LangChain JavaScript generator for creating LangChain-based agent projects
 */
class LangChainJSGenerator extends BaseJSGenerator {
  /**
   * Generate a LangChain JavaScript project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {
    console.log('🔗 Generating LangChain JavaScript project...');

    // Generate base structure first
    await super.generate(config, targetPath);

    // Generate LangChain-specific files
    await this.generateLangChainFiles(config, targetPath);

    // Update package.json with LangChain dependencies
    await this.updatePackageJson(config, targetPath);

    console.log('✅ LangChain JavaScript project generated');
  }

  /**
   * Generate LangChain-specific files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateLangChainFiles(config, targetPath) {
    // Generate chains directory
    const chainsPath = path.join(targetPath, 'src/chains');
    await fs.ensureDir(chainsPath);

    // Generate main chain file
    await this.generateMainChain(config, targetPath);

    // Generate tools
    await this.generateTools(config, targetPath);

    // Generate memory
    await this.generateMemory(config, targetPath);

    // Update main.js for LangChain
    await this.updateMainFile(config, targetPath);
  }

  /**
   * Generate main chain file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainChain(config, targetPath) {
    const chainsPath = path.join(targetPath, 'src/chains');
    const chainContent = `/**
 * Main LangChain chain for ${config.project.name}
 */

const { LLMChain } = require('langchain/chains');
const { PromptTemplate } = require('langchain/prompts');
const { startTracing, endTracing } = require('@handit.ai/handit-ai');

const Config = require('../config');
const { getTools } = require('../tools');
const { getMemory } = require('../memory');

class ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain {
    constructor(config) {
        this.config = config;
        this.tools = getTools(config);
        this.memory = getMemory(config);
        this.chains = this._buildChains();
    }
    
    _buildChains() {
        /**
         * Build LangChain chains for each stage.
         * 
         * @returns {object} Dictionary of chains for each stage
         */
        const chains = {};
        
        for (const stage of this.config.agentStages) {
            chains[stage] = this._buildStageChain(stage);
        }
        
        return chains;
    }
    
    _buildStageChain(stage) {
        /**
         * Build a chain for a specific stage.
         * 
         * @param {string} stage - Stage name (retrieve, reason, act, etc.)
         * @returns {LLMChain} Configured LLMChain for the stage
         */
        // Get stage-specific prompt
        const promptTemplate = this._getStagePrompt(stage);
        
        // Create prompt template
        const prompt = new PromptTemplate({
            inputVariables: ['input', 'context', 'memory'],
            template: promptTemplate
        });
        
        // Create chain (you'll need to implement _getLLM method)
        const chain = new LLMChain({
            llm: this._getLLM(),
            prompt: prompt,
            memory: this.memory,
            verbose: true
        });
        
        return chain;
    }
    
    _getStagePrompt(stage) {
        /**
         * Get prompt template for a specific stage.
         * 
         * @param {string} stage - Stage name
         * @returns {string} Prompt template string
         */
        const stagePrompts = {
            retrieve: \`You are a retrieval specialist. Your task is to gather relevant information.

Input: {input}
Context: {context}
Memory: {memory}

Please retrieve and organize relevant information for the next stage.\`,

            reason: \`You are a reasoning specialist. Your task is to analyze and reason about the information.

Input: {input}
Context: {context}
Memory: {memory}

Please analyze the information and provide reasoning for the next stage.\`,

            act: \`You are an action specialist. Your task is to execute actions based on reasoning.

Input: {input}
Context: {context}
Memory: {memory}

Please execute the appropriate actions and provide results.\`
        };
        
        return stagePrompts[stage] || \`Process the input for the {stage} stage.

Input: {input}
Context: {context}
Memory: {memory}

Please process this information appropriately.\`;
    }
    
    _getLLM() {
        /**
         * Get the configured LLM instance.
         * 
         * @returns {object} Configured LLM instance
         */
        // TODO: Implement LLM configuration based on config.model
        // This is a placeholder - you'll need to implement based on your model provider
        
        if (this.config.model.provider === 'mock') {
            const { FakeListLLM } = require('langchain/llms/fake');
            return new FakeListLLM({ responses: ['Mock response'] });
        } else if (this.config.model.provider === 'ollama') {
            const { Ollama } = require('langchain/llms/ollama');
            return new Ollama({ model: this.config.model.name });
        } else {
            throw new Error(\`Unsupported model provider: \${this.config.model.provider}\`);
        }
    }
    
    async executeStage(stage, inputData) {
        /**
         * Execute a specific stage of the chain.
         * 
         * @param {string} stage - Stage name
         * @param {any} inputData - Input data
         * @returns {any} Stage output
         */
        if (!this.chains[stage]) {
            throw new Error(\`Unknown stage: \${stage}\`);
        }
        
        // Prepare input for the chain
        const chainInput = {
            input: String(inputData),
            context: this._getContext(),
            memory: this._getMemoryContext()
        };
        
        // Execute the chain
        const result = await this.chains[stage].call(chainInput);
        
        return result;
    }
    
    _getContext() {
        /**
         * Get current context for the chain.
         * 
         * @returns {string} Context string
         */
        return \`Agent: \${this.config.projectName}, Framework: \${this.config.framework}\`;
    }
    
    _getMemoryContext() {
        /**
         * Get memory context for the chain.
         * 
         * @returns {string} Memory context string
         */
        if (this.memory) {
            try {
                return JSON.stringify(this.memory.loadMemoryVariables({}));
            } catch (error) {
                return 'Memory error';
            }
        }
        return 'No memory available';
    }
    
    async runPipeline(inputData) {
        /**
         * Run the complete pipeline through all stages.
         * 
         * @param {any} inputData - Initial input data
         * @returns {any} Final pipeline result
         */
        let result = inputData;
        
        for (const stage of this.config.agentStages) {
            result = await this.executeStage(stage, result);
        }
        
        return result;
    }
}

function createChain(config) {
    /**
     * Create and return a configured chain instance.
     * 
     * @param {Config} config - Configuration object
     * @returns {${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain} Configured chain instance
     */
    return new ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain(config);
}

module.exports = { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain, createChain };
`;

    await fs.writeFile(path.join(targetPath, 'src/chains/main.js'), chainContent);

    // Generate index.js for chains
    const chainsIndexContent = `/**
 * LangChain chains for ${config.project.name}
 */

const { ${config.project.name.replace(/\s+/g, '')}Chain, createChain } = require('./main');

module.exports = { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain, createChain };
`;

    await fs.writeFile(path.join(chainsPath, 'index.js'), chainsIndexContent);
  }

  /**
   * Generate tools for LangChain
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateTools(config, targetPath) {
    const toolsPath = path.join(targetPath, 'src/tools');
    await fs.ensureDir(toolsPath);

    const toolsContent = `/**
 * LangChain tools for ${config.project.name}
 */

const { Tool } = require('langchain/tools');
const { startTracing, endTracing } = require('@handit.ai/handit-ai');

class CustomTool {
    /**
     * Base class for custom tools with Handit tracing
     */
    constructor(name, description, agentName = '${config.project.name}') {
        this.name = name;
        this.description = description;
        this.agentName = agentName;
    }
    
    async _run(query) {
        /**
         * Execute the tool with the given query.
         * 
         * @param {string} query - Input query for the tool
         * @returns {string} Tool output
         */
        startTracing({ agent: \`\${this.agentName}_\${this.name}\` });
        try {
            // Override in subclasses
            return \`Tool \${this.name} executed with query: \${query}\`;
        } finally {
            endTracing();
        }
    }
}

// Tool implementations
class HttpFetchTool extends CustomTool {
    constructor() {
        super(
            'http_fetch',
            'Make HTTP requests to fetch data from URLs'
        );
    }
    
    async _run(query) {
        // TODO: Implement HTTP fetch logic
        return \`HTTP fetch result for: \${query}\`;
    }
}

class WebSearchTool extends CustomTool {
    constructor() {
        super(
            'web_search',
            'Search the web for information'
        );
    }
    
    async _run(query) {
        // TODO: Implement web search logic
        return \`Web search result for: \${query}\`;
    }
}

class CalculatorTool extends CustomTool {
    constructor() {
        super(
            'calculator',
            'Perform mathematical calculations'
        );
    }
    
    async _run(query) {
        try {
            // Simple calculator implementation
            const result = eval(query);
            return String(result);
        } catch (error) {
            return \`Calculation error: \${error.message}\`;
        }
    }
}

class FileIOTool extends CustomTool {
    constructor() {
        super(
            'file_io',
            'Read from and write to files'
        );
    }
    
    async _run(query) {
        // TODO: Implement file I/O logic
        return \`File I/O result for: \${query}\`;
    }
}

class CodeRunTool extends CustomTool {
    constructor() {
        super(
            'code_run',
            'Execute code snippets'
        );
    }
    
    async _run(query) {
        // TODO: Implement code execution logic
        return \`Code execution result for: \${query}\`;
    }
}

function getTools(config) {
    /**
     * Get available tools based on configuration.
     * 
     * @param {Config} config - Configuration object
     * @returns {Tool[]} List of configured tools
     */
    const toolClasses = {
        http_fetch: HttpFetchTool,
        web_search: WebSearchTool,
        calculator: CalculatorTool,
        file_io: FileIOTool,
        code_run: CodeRunTool
    };
    
    const tools = [];
    
    for (const toolName of config.toolsSelected) {
        if (toolClasses[toolName]) {
            const toolInstance = new toolClasses[toolName]();
            tools.push(new Tool({
                name: toolInstance.name,
                description: toolInstance.description,
                func: toolInstance._run.bind(toolInstance)
            }));
        }
    }
    
    return tools;
}

function getToolByName(toolName) {
    /**
     * Get a specific tool by name.
     * 
     * @param {string} toolName - Name of the tool
     * @returns {CustomTool} Tool instance
     */
    const toolClasses = {
        http_fetch: HttpFetchTool,
        web_search: WebSearchTool,
        calculator: CalculatorTool,
        file_io: FileIOTool,
        code_run: CodeRunTool
    };
    
    if (toolClasses[toolName]) {
        return new toolClasses[toolName]();
    }
    
    throw new Error(\`Unknown tool: \${toolName}\`);
}

module.exports = {
    CustomTool,
    HttpFetchTool,
    WebSearchTool,
    CalculatorTool,
    FileIOTool,
    CodeRunTool,
    getTools,
    getToolByName
};
`;

    await fs.writeFile(path.join(toolsPath, 'tools.js'), toolsContent);

    // Generate index.js for tools
    const toolsIndexContent = `/**
 * Tools for ${config.project.name}
 */

const {
    CustomTool,
    HttpFetchTool,
    WebSearchTool,
    CalculatorTool,
    FileIOTool,
    CodeRunTool,
    getTools,
    getToolByName
} = require('./tools');

module.exports = {
    CustomTool,
    HttpFetchTool,
    WebSearchTool,
    CalculatorTool,
    FileIOTool,
    CodeRunTool,
    getTools,
    getToolByName
};
`;

    await fs.writeFile(path.join(toolsPath, 'index.js'), toolsIndexContent);
  }

  /**
   * Generate memory configuration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMemory(config, targetPath) {
    const memoryPath = path.join(targetPath, 'src/memory');
    await fs.ensureDir(memoryPath);

    const memoryContent = `/**
 * Memory configuration for ${config.project.name}
 */

const { ConversationBufferMemory, ConversationSummaryMemory } = require('langchain/memory');

function getMemory(config) {
    /**
     * Get configured memory instance based on configuration.
     * 
     * @param {Config} config - Configuration object
     * @returns {object|null} Configured memory instance or null
     */
    const memoryConfig = config.getStorageConfig();
    
    if (memoryConfig.memory === 'none') {
        return null;
    }
    
    // For now, use simple buffer memory
    // TODO: Implement more sophisticated memory based on storage config
    const memory = new ConversationBufferMemory({
        memoryKey: 'chat_history',
        returnMessages: true
    });
    
    return memory;
}

function createVectorMemory(config) {
    /**
     * Create vector-based memory if configured.
     * 
     * @param {Config} config - Configuration object
     * @returns {object|null} Vector memory instance or null
     */
    const memoryConfig = config.getStorageConfig();
    
    if (memoryConfig.memory !== 'faiss-local') {
        return null;
    }
    
    // TODO: Implement FAISS-based vector memory
    // This would require additional setup for vector storage
    return null;
}

function getMemoryContext(memory) {
    /**
     * Get memory context as string.
     * 
     * @param {object|null} memory - Memory instance
     * @returns {string} Memory context string
     */
    if (!memory) {
        return 'No memory available';
    }
    
    try {
        const memoryVars = memory.loadMemoryVariables({});
        return JSON.stringify(memoryVars);
    } catch (error) {
        return 'Memory error';
    }
}

module.exports = { getMemory, createVectorMemory, getMemoryContext };
`;

    await fs.writeFile(path.join(memoryPath, 'memory.js'), memoryContent);

    // Generate index.js for memory
    const memoryIndexContent = `/**
 * Memory management for ${config.project.name}
 */

const { getMemory, createVectorMemory, getMemoryContext } = require('./memory');

module.exports = { getMemory, createVectorMemory, getMemoryContext };
`;

    await fs.writeFile(path.join(memoryPath, 'index.js'), memoryIndexContent);
  }

  /**
   * Update main.js for LangChain integration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env node
/**
 * Main application entry point for ${config.project.name} (LangChain)
 */

require('dotenv').config();
const { configure, startTracing, endTracing } = require('@handit.ai/handit-ai');

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

const Config = require('./src/config');
const { createChain } = require('./src/chains');

class LangChainAgent {
    constructor() {
        this.config = new Config();
        this.chain = createChain(this.config);
    }
    
    async process(inputData) {
        /**
         * Process input through the LangChain pipeline
         */
        const result = await this.chain.runPipeline(inputData);
        return result;
    }
}

async function main() {
    /**
     * Main application entry point
     */
    console.log(\`Starting ${config.project.name} (LangChain)...\`);
    
    // Initialize agent
    const agent = new LangChainAgent();
    
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

module.exports = { LangChainAgent };
`;

    await fs.writeFile(path.join(targetPath, 'main.js'), mainContent);
  }

  /**
   * Update package.json with LangChain dependencies
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updatePackageJson(config, targetPath) {
    const packageJsonPath = path.join(targetPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    // Add LangChain dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'langchain': '^0.1.0',
      'langchain-community': '^0.0.10',
      'langchain-core': '^0.1.0',
      'openai': '^4.0.0',
      'ollama': '^0.1.0',
      'requests': '^2.31.0',
      'cheerio': '^1.0.0',
      'duckduckgo-search': '^3.9.0'
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

export default LangChainJSGenerator;
