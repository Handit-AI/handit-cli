const fs = require('fs-extra');
const path = require('path');
const BaseJSGenerator = require('./base');

/**
 * LangGraph JavaScript generator for creating LangGraph-based agent projects
 */
class LangGraphJSGenerator extends BaseJSGenerator {
  /**
   * Generate a LangGraph JavaScript project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {
    console.log('🕸️ Generating LangGraph JavaScript project...');

    // Generate base structure first
    await super.generate(config, targetPath);

    // Generate LangGraph-specific files
    await this.generateLangGraphFiles(config, targetPath);

    // Update package.json with LangGraph dependencies
    await this.updatePackageJson(config, targetPath);

    console.log('✅ LangGraph JavaScript project generated');
  }

  /**
   * Generate LangGraph-specific files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateLangGraphFiles(config, targetPath) {
    // Generate graph directory
    const graphPath = path.join(targetPath, 'src/graph');
    await fs.ensureDir(graphPath);

    // Generate main graph file
    await this.generateMainGraph(config, targetPath);

    // Generate state definition
    await this.generateState(config, targetPath);

    // Generate nodes for LangGraph
    await this.generateGraphNodes(config, targetPath);

    // Update main.js for LangGraph
    await this.updateMainFile(config, targetPath);
  }

  /**
   * Generate main graph file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainGraph(config, targetPath) {
    const graphPath = path.join(targetPath, 'src/graph');
    const graphContent = `/**
 * Main LangGraph for ${config.project.name}
 */

const { StateGraph, END } = require('langgraph');
const { HumanMessage, AIMessage } = require('langchain/schema');
const { startTracing, endTracing } = require('@handit.ai/handit-ai');

const Config = require('../config');
const { AgentState } = require('../state');
const { getGraphNodes } = require('./nodes');

class ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph {
    constructor(config) {
        this.config = config;
        this.graph = this._buildGraph();
    }
    
    _buildGraph() {
        /**
         * Build the LangGraph state graph.
         * 
         * @returns {StateGraph} Configured StateGraph instance
         */
        // Create the graph
        const graph = new StateGraph(AgentState);
        
        // Add nodes for each stage
        const nodes = getGraphNodes(this.config);
        
        for (const stage of this.config.agentStages) {
            if (nodes[stage]) {
                graph.addNode(stage, nodes[stage]);
            }
        }
        
        // Define the flow based on orchestration style
        if (this.config.orchestrationStyle === 'state-graph') {
            this._addStateGraphEdges(graph);
        } else if (this.config.orchestrationStyle === 'pipeline') {
            this._addPipelineEdges(graph);
        } else if (this.config.orchestrationStyle === 'router') {
            this._addRouterEdges(graph);
        } else {
            // Default to pipeline
            this._addPipelineEdges(graph);
        }
        
        // Compile the graph
        return graph.compile();
    }
    
    _addPipelineEdges(graph) {
        /**
         * Add edges for pipeline-style orchestration (sequential).
         * 
         * @param {StateGraph} graph - StateGraph instance
         */
        const stages = this.config.agentStages;
        
        // Add edges in sequence
        for (let i = 0; i < stages.length - 1; i++) {
            graph.addEdge(stages[i], stages[i + 1]);
        }
        
        // Add edge from last stage to END
        if (stages.length > 0) {
            graph.addEdge(stages[stages.length - 1], END);
        }
    }
    
    _addRouterEdges(graph) {
        /**
         * Add edges for router-style orchestration (branching).
         * 
         * @param {StateGraph} graph - StateGraph instance
         */
        const stages = this.config.agentStages;
        
        if (stages.length >= 2) {
            // First stage routes to others
            graph.addEdge(stages[0], stages[1]);
            
            // Add conditional routing logic
            // TODO: Implement conditional routing based on state
            for (let i = 1; i < stages.length; i++) {
                graph.addEdge(stages[i], END);
            }
        }
    }
    
    _addStateGraphEdges(graph) {
        /**
         * Add edges for state-graph orchestration (complex state management).
         * 
         * @param {StateGraph} graph - StateGraph instance
         */
        const stages = this.config.agentStages;
        
        // Add edges with conditional logic
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (i < stages.length - 1) {
                // Add conditional edge to next stage or END
                graph.addConditionalEdges(
                    stage,
                    this._getNextStage.bind(this),
                    {
                        continue: stages[i + 1],
                        end: END
                    }
                );
            } else {
                graph.addEdge(stage, END);
            }
        }
    }
    
    _getNextStage(state) {
        /**
         * Determine the next stage based on current state.
         * 
         * @param {AgentState} state - Current agent state
         * @returns {string} Next stage name or "end"
         */
        // TODO: Implement conditional logic based on state
        // For now, always continue to next stage
        return 'continue';
    }
    
    async execute(inputData) {
        /**
         * Execute the graph with input data.
         * 
         * @param {any} inputData - Input data for the graph
         * @returns {any} Graph execution result
         */
        startTracing({ agent: '${config.project.name}_graph' });
        try {
            // Prepare initial state
            const initialState = {
                input: inputData,
                messages: [new HumanMessage(String(inputData))],
                context: {},
                results: {},
                currentStage: this.config.agentStages[0] || null,
                error: null,
                metadata: {}
            };
            
            // Execute the graph
            const result = await this.graph.invoke(initialState);
            
            return result;
        } finally {
            endTracing();
        }
    }
    
    getGraphInfo() {
        /**
         * Get information about the graph structure.
         * 
         * @returns {object} Graph information dictionary
         */
        return {
            nodes: Object.keys(this.graph.nodes || {}),
            edges: Object.keys(this.graph.edges || {}),
            orchestrationStyle: this.config.orchestrationStyle,
            stages: this.config.agentStages
        };
    }
}

function createGraph(config) {
    /**
     * Create and return a configured graph instance.
     * 
     * @param {Config} config - Configuration object
     * @returns {${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph} Configured graph instance
     */
    return new ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph(config);
}

module.exports = { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph, createGraph };
`;

    await fs.writeFile(path.join(targetPath, 'src/graph/main.js'), graphContent);

    // Generate index.js for graph
    const graphIndexContent = `/**
 * LangGraph for ${config.project.name}
 */

const { ${config.project.name.replace(/\s+/g, '')}Graph, createGraph } = require('./main');

module.exports = { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph, createGraph };
`;

    await fs.writeFile(path.join(graphPath, 'index.js'), graphIndexContent);
  }

  /**
   * Generate state definition
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateState(config, targetPath) {
    const statePath = path.join(targetPath, 'src/state');
    await fs.ensureDir(statePath);

    const stateContent = `/**
 * State definition for ${config.project.name} LangGraph
 */

const { HumanMessage, AIMessage } = require('langchain/schema');

class AgentState {
    /**
     * State definition for the agent graph.
     * 
     * This defines the structure of data that flows through the graph.
     */
    constructor() {
        this.input = null;
        this.messages = [];
        this.context = {};
        this.results = {};
        this.currentStage = null;
        this.error = null;
        this.metadata = {};
    }
    
    static fromObject(obj) {
        /**
         * Create AgentState from object.
         * 
         * @param {object} obj - Object to convert
         * @returns {AgentState} AgentState instance
         */
        const state = new AgentState();
        Object.assign(state, obj);
        return state;
    }
    
    toObject() {
        /**
         * Convert AgentState to plain object.
         * 
         * @returns {object} Plain object representation
         */
        return {
            input: this.input,
            messages: this.messages,
            context: this.context,
            results: this.results,
            currentStage: this.currentStage,
            error: this.error,
            metadata: this.metadata
        };
    }
}

function createInitialState(inputData, options = {}) {
    /**
     * Create initial state for the graph.
     * 
     * @param {any} inputData - Initial input data
     * @param {object} options - Additional state parameters
     * @returns {AgentState} Initial agent state
     */
    const state = new AgentState();
    state.input = inputData;
    state.messages = [new HumanMessage(String(inputData))];
    state.context = options.context || {};
    state.results = options.results || {};
    state.currentStage = options.currentStage || null;
    state.error = options.error || null;
    state.metadata = options.metadata || {};
    
    return state;
}

function updateState(currentState, updates = {}) {
    /**
     * Update the current state with new values.
     * 
     * @param {AgentState} currentState - Current state
     * @param {object} updates - State updates
     * @returns {AgentState} Updated state
     */
    const newState = new AgentState();
    newState.input = updates.input !== undefined ? updates.input : currentState.input;
    newState.messages = updates.messages !== undefined ? updates.messages : currentState.messages;
    newState.context = updates.context !== undefined ? updates.context : currentState.context;
    newState.results = updates.results !== undefined ? updates.results : currentState.results;
    newState.currentStage = updates.currentStage !== undefined ? updates.currentStage : currentState.currentStage;
    newState.error = updates.error !== undefined ? updates.error : currentState.error;
    newState.metadata = updates.metadata !== undefined ? updates.metadata : currentState.metadata;
    
    return newState;
}

function getStageResult(state, stage) {
    /**
     * Get result from a specific stage.
     * 
     * @param {AgentState} state - Current state
     * @param {string} stage - Stage name
     * @returns {any} Stage result or null
     */
    return state.results[stage] || null;
}

function setStageResult(state, stage, result) {
    /**
     * Set result for a specific stage.
     * 
     * @param {AgentState} state - Current state
     * @param {string} stage - Stage name
     * @param {any} result - Stage result
     * @returns {AgentState} Updated state
     */
    const updatedResults = { ...state.results };
    updatedResults[stage] = result;
    
    return updateState(state, { results: updatedResults });
}

function addMessage(state, message) {
    /**
     * Add a message to the conversation.
     * 
     * @param {AgentState} state - Current state
     * @param {BaseMessage} message - Message to add
     * @returns {AgentState} Updated state
     */
    const updatedMessages = [...state.messages, message];
    return updateState(state, { messages: updatedMessages });
}

function setError(state, error) {
    /**
     * Set error in the state.
     * 
     * @param {AgentState} state - Current state
     * @param {string} error - Error message
     * @returns {AgentState} Updated state
     */
    return updateState(state, { error });
}

function clearError(state) {
    /**
     * Clear error from the state.
     * 
     * @param {AgentState} state - Current state
     * @returns {AgentState} Updated state
     */
    return updateState(state, { error: null });
}

module.exports = {
    AgentState,
    createInitialState,
    updateState,
    getStageResult,
    setStageResult,
    addMessage,
    setError,
    clearError
};
`;

    await fs.writeFile(path.join(statePath, 'state.js'), stateContent);

    // Generate index.js for state
    const stateIndexContent = `/**
 * State management for ${config.project.name}
 */

const {
    AgentState,
    createInitialState,
    updateState,
    getStageResult,
    setStageResult,
    addMessage,
    setError,
    clearError
} = require('./state');

module.exports = {
    AgentState,
    createInitialState,
    updateState,
    getStageResult,
    setStageResult,
    addMessage,
    setError,
    clearError
};
`;

    await fs.writeFile(path.join(statePath, 'index.js'), stateIndexContent);
  }

  /**
   * Generate graph nodes
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateGraphNodes(config, targetPath) {
    const nodesPath = path.join(targetPath, 'src/graph/nodes');
    await fs.ensureDir(nodesPath);

    const nodesContent = `/**
 * Graph nodes for ${config.project.name} LangGraph
 */

const { AIMessage } = require('langchain/schema');
const { startTracing, endTracing } = require('@handit.ai/handit-ai');
const { setStageResult, addMessage, setError, clearError } = require('../../state');

async function retrieveNode(state) {
    /**
     * Retrieve node for gathering information.
     * 
     * @param {AgentState} state - Current agent state
     * @returns {AgentState} Updated state with retrieval results
     */
    startTracing({ agent: '${config.project.name}_retrieve' });
    try {
        clearError(state);
        
        // TODO: Implement retrieval logic
        // This is a placeholder implementation
        const inputData = state.input;
        
        // Simulate retrieval
        const retrievedData = \`Retrieved information for: \${inputData}\`;
        
        // Update state with results
        state = setStageResult(state, 'retrieve', retrievedData);
        
        // Add AI message
        const message = new AIMessage(\`Retrieved: \${retrievedData}\`);
        state = addMessage(state, message);
        
        return state;
        
    } catch (error) {
        return setError(state, \`Retrieval error: \${error.message}\`);
    } finally {
        endTracing();
    }
}

async function reasonNode(state) {
    /**
     * Reason node for analyzing information.
     * 
     * @param {AgentState} state - Current agent state
     * @returns {AgentState} Updated state with reasoning results
     */
    startTracing({ agent: '${config.project.name}_reason' });
    try {
        clearError(state);
        
        // Get retrieval results
        const retrievedData = state.results.retrieve || '';
        
        // TODO: Implement reasoning logic
        // This is a placeholder implementation
        const reasoningResult = \`Reasoned about: \${retrievedData}\`;
        
        // Update state with results
        state = setStageResult(state, 'reason', reasoningResult);
        
        // Add AI message
        const message = new AIMessage(\`Reasoned: \${reasoningResult}\`);
        state = addMessage(state, message);
        
        return state;
        
    } catch (error) {
        return setError(state, \`Reasoning error: \${error.message}\`);
    } finally {
        endTracing();
    }
}

async function actNode(state) {
    /**
     * Act node for executing actions.
     * 
     * @param {AgentState} state - Current agent state
     * @returns {AgentState} Updated state with action results
     */
    startTracing({ agent: '${config.project.name}_act' });
    try {
        clearError(state);
        
        // Get reasoning results
        const reasoningData = state.results.reason || '';
        
        // TODO: Implement action logic
        // This is a placeholder implementation
        const actionResult = \`Acted on: \${reasoningData}\`;
        
        // Update state with results
        state = setStageResult(state, 'act', actionResult);
        
        // Add AI message
        const message = new AIMessage(\`Acted: \${actionResult}\`);
        state = addMessage(state, message);
        
        return state;
        
    } catch (error) {
        return setError(state, \`Action error: \${error.message}\`);
    } finally {
        endTracing();
    }
}

function getGraphNodes(config) {
    /**
     * Get graph nodes based on configuration.
     * 
     * @param {Config} config - Configuration object
     * @returns {object} Dictionary of node functions
     */
    const nodeFunctions = {
        retrieve: retrieveNode,
        reason: reasonNode,
        act: actNode
    };
    
    // Return only the nodes that are configured
    const result = {};
    for (const stage of config.agentStages) {
        if (nodeFunctions[stage]) {
            result[stage] = nodeFunctions[stage];
        }
    }
    
    return result;
}

function createCustomNode(stageName, logicFunc) {
    /**
     * Create a custom node function.
     * 
     * @param {string} stageName - Name of the stage
     * @param {Function} logicFunc - Logic function for the node
     * @returns {Function} Node function
     */
    return async function customNode(state) {
        startTracing({ agent: \`${config.project.name}_\${stageName}\` });
        try {
            clearError(state);
            const result = await logicFunc(state);
            state = setStageResult(state, stageName, result);
            return state;
        } catch (error) {
            return setError(state, \`\${stageName} error: \${error.message}\`);
        } finally {
            endTracing();
        }
    };
}

module.exports = {
    retrieveNode,
    reasonNode,
    actNode,
    getGraphNodes,
    createCustomNode
};
`;

    await fs.writeFile(path.join(nodesPath, 'nodes.js'), nodesContent);

    // Generate index.js for nodes
    const nodesIndexContent = `/**
 * Graph nodes for ${config.project.name}
 */

const {
    retrieveNode,
    reasonNode,
    actNode,
    getGraphNodes,
    createCustomNode
} = require('./nodes');

module.exports = {
    retrieveNode,
    reasonNode,
    actNode,
    getGraphNodes,
    createCustomNode
};
`;

    await fs.writeFile(path.join(nodesPath, 'index.js'), nodesIndexContent);
  }

  /**
   * Update main.js for LangGraph integration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env node
/**
 * Main application entry point for ${config.project.name} (LangGraph)
 */

require('dotenv').config();
const { configure, startTracing, endTracing } = require('@handit.ai/handit-ai');

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

const Config = require('./src/config');
const { createGraph } = require('./src/graph');

class LangGraphAgent {
    constructor() {
        this.config = new Config();
        this.graph = createGraph(this.config);
    }
    
    async process(inputData) {
        /**
         * Process input through the LangGraph
         */
        const result = await this.graph.execute(inputData);
        return result;
    }
    
    getGraphInfo() {
        /**
         * Get information about the graph structure
         */
        return this.graph.getGraphInfo();
    }
}

async function main() {
    /**
     * Main application entry point
     */
    console.log(\`Starting ${config.project.name} (LangGraph)...\`);
    
    // Initialize agent
    const agent = new LangGraphAgent();
    
    // Print graph information
    const graphInfo = agent.getGraphInfo();
    console.log(\`Graph structure: \${JSON.stringify(graphInfo, null, 2)}\`);
    
    // Example usage
    if ('${config.runtime.type}' === 'cli') {
        // CLI mode
        const inputData = process.argv[2] || await getUserInput();
        startTracing({ agent: '${config.project.name}' });
        try {
            const result = await agent.process(inputData);
            console.log(\`Result: \${JSON.stringify(result, null, 2)}\`);
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
            console.log(\`Result: \${JSON.stringify(result, null, 2)}\`);
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

module.exports = { LangGraphAgent };
`;

    await fs.writeFile(path.join(targetPath, 'main.js'), mainContent);
  }

  /**
   * Update package.json with LangGraph dependencies
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updatePackageJson(config, targetPath) {
    const packageJsonPath = path.join(targetPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    // Add LangGraph dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'langgraph': '^0.0.20',
      'langchain': '^0.1.0',
      'langchain-core': '^0.1.0',
      'langchain-community': '^0.0.10',
      'openai': '^4.0.0',
      'ollama': '^0.1.0',
      'networkx': '^3.0',
      'pydantic': '^2.0.0'
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }
}

module.exports = LangGraphJSGenerator;
