/**
 * Main agent class for Custom JS Agent (LangGraph)
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

export { LangGraphAgent };