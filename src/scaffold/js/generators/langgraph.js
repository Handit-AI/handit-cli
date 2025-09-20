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
  static async generate(config, targetPath, options = {}) {
    const { silent = false } = options;
    if (!silent) {
      console.log('🕸️ Generating LangGraph JavaScript project...');
    }

    // Generate base structure first
    await super.generate(config, targetPath, { silent });

    // Generate LangGraph-specific files
    await this.generateLangGraphFiles(config, targetPath);

    // Update package.json with LangGraph dependencies
    await this.updatePackageJson(config, targetPath);

    if (!silent) {
      console.log('✅ LangGraph JavaScript project generated');
    }
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

    // Update agent.js for LangGraph
    await this.updateAgentFile(config, targetPath);
  }

  /**
   * Generate runtime-specific imports based on configuration
   * @param {Object} config - Configuration object
   * @returns {string} Runtime-specific imports
   */
  static _generateRuntimeImports(config) {
    const runtimeType = config.runtime?.type || 'express';
    
    switch (runtimeType) {
      case 'express':
        return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';`;
        
      default:
        return '';
    }
  }

  /**
   * Generate runtime-specific code based on configuration
   * @param {Object} config - Configuration object
   * @returns {string} Runtime-specific code
   */
  static _generateRuntimeCode(config) {
    const runtimeType = config.runtime?.type || 'express';
    
    switch (runtimeType) {
      case 'cli':
        return `// CLI mode
const inputData = process.argv[2] || 'Hello, world!';
startTracing({ agent: '${config.project.name}' });
try {
    const result = await agent.process(inputData);
    console.log(\`Result: \${JSON.stringify(result, null, 2)}\`);
} finally {
    endTracing();
}`;
        
      case 'worker':
        return `// Worker mode - implement queue processing
console.log('Worker mode - implement your queue processing logic here');
// TODO: Add queue processing logic`;
        
      case 'express':
        return `// Express server setup
const app = express();
const port = process.env.PORT || ${config.runtime?.port || 3000};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: '${config.project.name}',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main agent endpoint
app.post('/agent', async (req, res) => {
    try {
        startTracing({ agent: '${config.project.name}' });
        const result = await agent.process(req.body);
        res.json({ success: true, result });
    } catch (error) {
        console.error('Agent processing error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        endTracing();
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, () => {
    console.log(\`🚀 ${config.project.name} server running on port \${port}\`);
    console.log(\`📊 Health check: http://localhost:\${port}/health\`);
    console.log(\`🤖 Agent endpoint: http://localhost:\${port}/agent\`);
});`;
        
      default:
        return `// Default mode
console.log('Running in default mode');
startTracing({ agent: '${config.project.name}' });
try {
    const result = await agent.process('Hello, world!');
    console.log(\`Result: \${JSON.stringify(result, null, 2)}\`);
} finally {
    endTracing();
}`;
    }
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

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { startTracing, endTracing } from '@handit.ai/handit-ai';

import Config from '../config.js';
import { getGraphNodes } from './nodes/index.js';

// Define the state schema
const AgentState = Annotation.Root({
    input: Annotation,
    messages: Annotation,
    context: Annotation,
    results: Annotation,
    currentStage: Annotation,
    error: Annotation,
    metadata: Annotation,
});

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
        
        for (const stage of this.config.agent_stages) {
            if (nodes[stage]) {
                graph.addNode(stage, nodes[stage]);
            }
        }
        
        // Define the flow - using state-graph orchestration
        this._addStateGraphEdges(graph);
        
        // Compile the graph
        return graph.compile();
    }
    
    _addPipelineEdges(graph) {
        /**
         * Add edges for pipeline-style orchestration (sequential).
         * 
         * @param {StateGraph} graph - StateGraph instance
         */
        const stages = this.config.agent_stages;
        
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
        const stages = this.config.agent_stages;
        
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
        const stages = this.config.agent_stages;
        
        if (!stages || stages.length === 0) {
            return;
        }
        
        // Add entrypoint from START to first stage
        graph.addEdge(START, stages[0]);
        
        // Add simple sequential edges
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const nextStage = stages[i + 1];
            
            if (nextStage) {
                // Add edge to next stage
                graph.addEdge(stage, nextStage);
            } else {
                // Last stage goes to END
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
                currentStage: this.config.agent_stages[0] || null,
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
            orchestrationStyle: 'state-graph',
            stages: this.config.agent_stages
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

export { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph, createGraph };
`;

    await fs.writeFile(path.join(targetPath, 'src/graph/main.js'), graphContent);

    // Generate index.js for graph
    const graphIndexContent = `/**
 * LangGraph for ${config.project.name}
 */

import { ${config.project.name.replace(/\s+/g, '')}Graph, createGraph } from './main.js';

export { ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph, createGraph };
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

import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

const AgentState = Annotation.Root({
    input: Annotation,
    messages: Annotation,
    context: Annotation,
    results: Annotation,
    currentStage: Annotation,
    error: Annotation,
    metadata: Annotation,
});

function createInitialState(inputData, options = {}) {
    /**
     * Create initial state for the graph.
     * 
     * @param {any} inputData - Initial input data
     * @param {object} options - Additional state parameters
     * @returns {object} Initial agent state
     */
    return {
        input: inputData,
        messages: [new HumanMessage(String(inputData))],
        context: options.context || {},
        results: options.results || {},
        currentStage: options.currentStage || null,
        error: options.error || null,
        metadata: options.metadata || {},
    };
}

function updateState(currentState, updates = {}) {
    /**
     * Update the current state with new values.
     * 
     * @param {object} currentState - Current state
     * @param {object} updates - State updates
     * @returns {object} Updated state
     */
    return {
        input: updates.input !== undefined ? updates.input : currentState.input,
        messages: updates.messages !== undefined ? updates.messages : currentState.messages,
        context: updates.context !== undefined ? updates.context : currentState.context,
        results: updates.results !== undefined ? updates.results : currentState.results,
        currentStage: updates.currentStage !== undefined ? updates.currentStage : currentState.currentStage,
        error: updates.error !== undefined ? updates.error : currentState.error,
        metadata: updates.metadata !== undefined ? updates.metadata : currentState.metadata,
    };
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

export {
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

import {
    AgentState,
    createInitialState,
    updateState,
    getStageResult,
    setStageResult,
    addMessage,
    setError,
    clearError
} from './state.js';

export {
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

import { AIMessage } from '@langchain/core/messages';
import { startTracing, endTracing } from '@handit.ai/handit-ai';
import { setStageResult, addMessage, setError, clearError } from '../../state/index.js';

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
    const result = {};
    
    // Create node functions for each stage in the config
    for (const stage of config.agent_stages) {
        result[stage] = async (state) => {
            console.log(\`Processing stage: \${stage}\`);
            return {
                ...state,
                currentStage: stage,
                results: {
                    ...state.results,
                    [stage]: \`Processed by \${stage}\`
                }
            };
        };
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

export {
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

import {
    retrieveNode,
    reasonNode,
    actNode,
    getGraphNodes,
    createCustomNode
} from './nodes.js';

export {
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

import dotenv from 'dotenv';
dotenv.config();
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

import Config from './src/config.js';
import { createGraph } from './src/graph/index.js';
${this._generateRuntimeImports(config)}

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

console.log(\`Starting ${config.project.name} (LangGraph)...\`);

// Initialize agent
const agent = new LangGraphAgent();

// Print graph information
const graphInfo = agent.getGraphInfo();
console.log(\`Graph structure: \${JSON.stringify(graphInfo, null, 2)}\`);

${this._generateRuntimeCode(config)}

export { LangGraphAgent };
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
      '@langchain/core': '^0.1.0',
      '@langchain/langgraph': '^0.1.0',
      '@langchain/openai': '^0.1.0',
      'langchain': '^0.1.0',
      'openai': '^4.0.0',
      'zod': '^3.0.0'
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  /**
   * Update agent.js for LangGraph
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateAgentFile(config, targetPath) {
    const agentPath = path.join(targetPath, 'src/agent.js');
    const agentContent = `/**
 * Main agent class for ${config.project.name} (LangGraph)
 */

import Config from './config.js';
import { StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { getGraphNodes } from './graph/nodes/nodes.js';
import { AgentState } from './state/state.js';

/**
 * Main agent class
 */
class LangGraphAgent {
  constructor(config = null) {
    this.config = config || new Config();
    this.graph = null;
  }

  async buildGraph() {
    if (this.graph) {
      return this.graph;
    }

    // Get node functions
    const nodeFunctions = getGraphNodes();
    
    // Create state graph
    const workflow = new StateGraph(AgentState);
    
    // Add nodes
    for (const [nodeName, nodeFunction] of Object.entries(nodeFunctions)) {
      workflow.addNode(nodeName, nodeFunction);
    }
    
    // Add edges based on agent stages
    const stages = this.config.agent.stages;
    if (stages && stages.length > 0) {
      // Add entrypoint from START to first stage
      workflow.addEdge(START, stages[0]);
      
      // Add edges between consecutive stages
      for (let i = 0; i < stages.length - 1; i++) {
        workflow.addEdge(stages[i], stages[i + 1]);
      }
      
      // Add edge from last stage to END
      workflow.addEdge(stages[stages.length - 1], END);
    }
    
    // Compile the graph with memory
    this.graph = workflow.compile({
      checkpointer: new MemorySaver()
    });
    
    return this.graph;
  }

  async process(inputData) {
    try {
      const graph = await this.buildGraph();
      
      const result = await graph.invoke({
        input: inputData,
        messages: []
      });
      
      return result;
    } catch (error) {
      console.error('Error processing input:', error);
      throw error;
    }
  }

  getGraphInfo() {
    return {
      framework: 'langgraph',
      orchestration_style: 'state-graph',
      nodes: this.config.agent.stages || [],
      tools: this.config.tools || []
    };
  }
}

export { LangGraphAgent };`;

    await fs.writeFile(agentPath, agentContent);
  }
}

module.exports = LangGraphJSGenerator;
