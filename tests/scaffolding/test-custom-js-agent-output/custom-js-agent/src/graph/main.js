/**
 * Main LangGraph for Custom JS Agent
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

class CustomJSAgentGraph {
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
        startTracing({ agent: 'Custom JS Agent_graph' });
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
     * @returns {CustomJSAgentGraph} Configured graph instance
     */
    return new CustomJSAgentGraph(config);
}

export { CustomJSAgentGraph, createGraph };
