const fs = require('fs-extra');
const path = require('path');
const BasePythonGenerator = require('./base');

/**
 * LangGraph Python generator for creating LangGraph-based agent projects
 */
class LangGraphPythonGenerator extends BasePythonGenerator {
  /**
   * Generate a LangGraph Python project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {
    console.log('🕸️ Generating LangGraph Python project...');

    // Generate base structure first
    await super.generate(config, targetPath);

    // Generate LangGraph-specific files
    await this.generateLangGraphFiles(config, targetPath);

    // Update requirements with LangGraph dependencies
    await this.updateRequirements(config, targetPath);

    console.log('✅ LangGraph Python project generated');
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

    // Update main.py for LangGraph
    await this.updateMainFile(config, targetPath);
  }

  /**
   * Generate main graph file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainGraph(config, targetPath) {
    const graphPath = path.join(targetPath, 'src/graph');
    const graphContent = `"""
Main LangGraph for ${config.project.name}
"""

from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from handit_ai import tracing

from ..config import Config
from ..state import AgentState
from .nodes import get_graph_nodes

@tracing(agent="${config.project.name}_graph")
class ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph:
    def __init__(self, config: Config):
        self.config = config
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """
        Build the LangGraph state graph.
        
        Returns:
            Configured StateGraph instance
        """
        # Create the graph
        graph = StateGraph(AgentState)
        
        # Add nodes for each stage
        nodes = get_graph_nodes(self.config)
        
        for stage in self.config.agent_stages:
            if stage in nodes:
                graph.add_node(stage, nodes[stage])
        
        # Define the flow based on orchestration style
        if self.config.orchestration_style == "state-graph":
            self._add_state_graph_edges(graph)
        elif self.config.orchestration_style == "pipeline":
            self._add_pipeline_edges(graph)
        elif self.config.orchestration_style == "router":
            self._add_router_edges(graph)
        else:
            # Default to pipeline
            self._add_pipeline_edges(graph)
        
        # Compile the graph
        return graph.compile()
    
    def _add_pipeline_edges(self, graph: StateGraph):
        """
        Add edges for pipeline-style orchestration (sequential).
        
        Args:
            graph: StateGraph instance
        """
        stages = self.config.agent_stages
        
        # Add edges in sequence
        for i in range(len(stages) - 1):
            graph.add_edge(stages[i], stages[i + 1])
        
        # Add edge from last stage to END
        if stages:
            graph.add_edge(stages[-1], END)
    
    def _add_router_edges(self, graph: StateGraph):
        """
        Add edges for router-style orchestration (branching).
        
        Args:
            graph: StateGraph instance
        """
        stages = self.config.agent_stages
        
        if len(stages) >= 2:
            # First stage routes to others
            graph.add_edge(stages[0], stages[1])
            
            # Add conditional routing logic
            # TODO: Implement conditional routing based on state
            for i in range(1, len(stages)):
                graph.add_edge(stages[i], END)
    
    def _add_state_graph_edges(self, graph: StateGraph):
        """
        Add edges for state-graph orchestration (complex state management).
        
        Args:
            graph: StateGraph instance
        """
        stages = self.config.agent_stages
        
        # Add edges with conditional logic
        for i, stage in enumerate(stages):
            if i < len(stages) - 1:
                # Add conditional edge to next stage or END
                graph.add_conditional_edges(
                    stage,
                    self._get_next_stage,
                    {
                        "continue": stages[i + 1] if i + 1 < len(stages) else END,
                        "end": END
                    }
                )
            else:
                graph.add_edge(stage, END)
    
    def _get_next_stage(self, state: AgentState) -> str:
        """
        Determine the next stage based on current state.
        
        Args:
            state: Current agent state
            
        Returns:
            Next stage name or "end"
        """
        # TODO: Implement conditional logic based on state
        # For now, always continue to next stage
        return "continue"
    
    async def execute(self, input_data: Any) -> Any:
        """
        Execute the graph with input data.
        
        Args:
            input_data: Input data for the graph
            
        Returns:
            Graph execution result
        """
        # Prepare initial state
        initial_state = {
            "input": input_data,
            "messages": [HumanMessage(content=str(input_data))],
            "context": {},
            "results": {},
            "current_stage": self.config.agent_stages[0] if self.config.agent_stages else None
        }
        
        # Execute the graph
        result = await self.graph.ainvoke(initial_state)
        
        return result
    
    def get_graph_info(self) -> Dict[str, Any]:
        """
        Get information about the graph structure.
        
        Returns:
            Graph information dictionary
        """
        return {
            "nodes": list(self.graph.nodes.keys()),
            "edges": list(self.graph.edges.keys()),
            "orchestration_style": self.config.orchestration_style,
            "stages": self.config.agent_stages
        }

def create_graph(config: Config) -> ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph:
    """
    Create and return a configured graph instance.
    
    Args:
        config: Configuration object
        
    Returns:
        Configured graph instance
    """
    return ${config.project.name.replace(/\s+/g, '')}Graph(config)
`;

    await fs.writeFile(path.join(targetPath, 'src/graph/main.py'), graphContent);

    // Generate __init__.py for graph
    const graphInitContent = `"""
LangGraph for ${config.project.name}
"""

from .main import ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph, create_graph

__all__ = ["${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Graph", "create_graph"]
`;

    await fs.writeFile(path.join(graphPath, '__init__.py'), graphInitContent);
  }

  /**
   * Generate state definition
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateState(config, targetPath) {
    const statePath = path.join(targetPath, 'src/state');
    await fs.ensureDir(statePath);

    const stateContent = `"""
State definition for ${config.project.name} LangGraph
"""

from typing import Dict, Any, List, Optional, TypedDict, Annotated
from langchain_core.messages import BaseMessage
from operator import add

class AgentState(TypedDict):
    """
    State definition for the agent graph.
    
    This defines the structure of data that flows through the graph.
    """
    # Input data
    input: Any
    
    # Messages for conversation
    messages: Annotated[List[BaseMessage], add]
    
    # Context data
    context: Dict[str, Any]
    
    # Results from each stage
    results: Dict[str, Any]
    
    # Current stage
    current_stage: Optional[str]
    
    # Error information
    error: Optional[str]
    
    # Metadata
    metadata: Dict[str, Any]

def create_initial_state(input_data: Any, **kwargs) -> AgentState:
    """
    Create initial state for the graph.
    
    Args:
        input_data: Initial input data
        **kwargs: Additional state parameters
        
    Returns:
        Initial agent state
    """
    from langchain_core.messages import HumanMessage
    
    return AgentState(
        input=input_data,
        messages=[HumanMessage(content=str(input_data))],
        context=kwargs.get("context", {}),
        results=kwargs.get("results", {}),
        current_stage=kwargs.get("current_stage", None),
        error=kwargs.get("error", None),
        metadata=kwargs.get("metadata", {})
    )

def update_state(current_state: AgentState, **updates) -> AgentState:
    """
    Update the current state with new values.
    
    Args:
        current_state: Current state
        **updates: State updates
        
    Returns:
        Updated state
    """
    return AgentState(
        input=updates.get("input", current_state["input"]),
        messages=updates.get("messages", current_state["messages"]),
        context=updates.get("context", current_state["context"]),
        results=updates.get("results", current_state["results"]),
        current_stage=updates.get("current_stage", current_state["current_stage"]),
        error=updates.get("error", current_state["error"]),
        metadata=updates.get("metadata", current_state["metadata"])
    )

def get_stage_result(state: AgentState, stage: str) -> Any:
    """
    Get result from a specific stage.
    
    Args:
        state: Current state
        stage: Stage name
        
    Returns:
        Stage result or None
    """
    return state["results"].get(stage)

def set_stage_result(state: AgentState, stage: str, result: Any) -> AgentState:
    """
    Set result for a specific stage.
    
    Args:
        state: Current state
        stage: Stage name
        result: Stage result
        
    Returns:
        Updated state
    """
    updated_results = state["results"].copy()
    updated_results[stage] = result
    
    return update_state(state, results=updated_results)

def add_message(state: AgentState, message: BaseMessage) -> AgentState:
    """
    Add a message to the conversation.
    
    Args:
        state: Current state
        message: Message to add
        
    Returns:
        Updated state
    """
    updated_messages = state["messages"] + [message]
    return update_state(state, messages=updated_messages)

def set_error(state: AgentState, error: str) -> AgentState:
    """
    Set error in the state.
    
    Args:
        state: Current state
        error: Error message
        
    Returns:
        Updated state
    """
    return update_state(state, error=error)

def clear_error(state: AgentState) -> AgentState:
    """
    Clear error from the state.
    
    Args:
        state: Current state
        
    Returns:
        Updated state
    """
    return update_state(state, error=None)
`;

    await fs.writeFile(path.join(statePath, 'state.py'), stateContent);

    // Generate __init__.py for state
    const stateInitContent = `"""
State management for ${config.project.name}
"""

from .state import (
    AgentState,
    create_initial_state,
    update_state,
    get_stage_result,
    set_stage_result,
    add_message,
    set_error,
    clear_error
)

__all__ = [
    "AgentState",
    "create_initial_state",
    "update_state",
    "get_stage_result",
    "set_stage_result",
    "add_message",
    "set_error",
    "clear_error"
]
`;

    await fs.writeFile(path.join(statePath, '__init__.py'), stateInitContent);
  }

  /**
   * Generate graph nodes
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateGraphNodes(config, targetPath) {
    const nodesPath = path.join(targetPath, 'src/graph/nodes');
    await fs.ensureDir(nodesPath);

    const nodesContent = `"""
Graph nodes for ${config.project.name} LangGraph
"""

from typing import Dict, Any, Callable
from langchain_core.messages import AIMessage
from handit_ai import tracing

from ...config import Config
from ...state import AgentState, set_stage_result, add_message, set_error, clear_error

@tracing(agent="${config.project.name}_retrieve")
async def retrieve_node(state: AgentState) -> AgentState:
    """
    Retrieve node for gathering information.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with retrieval results
    """
    try:
        clear_error(state)
        
        # TODO: Implement retrieval logic
        # This is a placeholder implementation
        input_data = state["input"]
        
        # Simulate retrieval
        retrieved_data = f"Retrieved information for: {input_data}"
        
        # Update state with results
        state = set_stage_result(state, "retrieve", retrieved_data)
        
        # Add AI message
        message = AIMessage(content=f"Retrieved: {retrieved_data}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        return set_error(state, f"Retrieval error: {str(e)}")

@tracing(agent="${config.project.name}_reason")
async def reason_node(state: AgentState) -> AgentState:
    """
    Reason node for analyzing information.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with reasoning results
    """
    try:
        clear_error(state)
        
        # Get retrieval results
        retrieved_data = state["results"].get("retrieve", "")
        
        # TODO: Implement reasoning logic
        # This is a placeholder implementation
        reasoning_result = f"Reasoned about: {retrieved_data}"
        
        # Update state with results
        state = set_stage_result(state, "reason", reasoning_result)
        
        # Add AI message
        message = AIMessage(content=f"Reasoned: {reasoning_result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        return set_error(state, f"Reasoning error: {str(e)}")

@tracing(agent="${config.project.name}_act")
async def act_node(state: AgentState) -> AgentState:
    """
    Act node for executing actions.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with action results
    """
    try:
        clear_error(state)
        
        # Get reasoning results
        reasoning_data = state["results"].get("reason", "")
        
        # TODO: Implement action logic
        # This is a placeholder implementation
        action_result = f"Acted on: {reasoning_data}"
        
        # Update state with results
        state = set_stage_result(state, "act", action_result)
        
        # Add AI message
        message = AIMessage(content=f"Acted: {action_result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        return set_error(state, f"Action error: {str(e)}")

def get_graph_nodes(config: Config) -> Dict[str, Callable]:
    """
    Get graph nodes based on configuration.
    
    Args:
        config: Configuration object
        
    Returns:
        Dictionary of node functions
    """
    node_functions = {
        "retrieve": retrieve_node,
        "reason": reason_node,
        "act": act_node
    }
    
    # Return only the nodes that are configured
    return {
        stage: node_functions[stage]
        for stage in config.agent_stages
        if stage in node_functions
    }

def create_custom_node(stage_name: str, logic_func: Callable) -> Callable:
    """
    Create a custom node function.
    
    Args:
        stage_name: Name of the stage
        logic_func: Logic function for the node
        
    Returns:
        Node function
    """
    @tracing(agent=f"${config.project.name}_{stage_name}")
    async def custom_node(state: AgentState) -> AgentState:
        try:
            clear_error(state)
            result = await logic_func(state)
            state = set_stage_result(state, stage_name, result)
            return state
        except Exception as e:
            return set_error(state, f"{stage_name} error: {str(e)}")
    
    return custom_node
`;

    await fs.writeFile(path.join(nodesPath, 'nodes.py'), nodesContent);

    // Generate __init__.py for nodes
    const nodesInitContent = `"""
Graph nodes for ${config.project.name}
"""

from .nodes import (
    retrieve_node,
    reason_node,
    act_node,
    get_graph_nodes,
    create_custom_node
)

__all__ = [
    "retrieve_node",
    "reason_node",
    "act_node",
    "get_graph_nodes",
    "create_custom_node"
]
`;

    await fs.writeFile(path.join(nodesPath, '__init__.py'), nodesInitContent);
  }

  /**
   * Update main.py for LangGraph integration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
Main application entry point for ${config.project.name} (LangGraph)
"""

import asyncio
import os
from dotenv import load_dotenv
from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.config import Config
from src.graph import create_graph

class LangGraphAgent:
    def __init__(self):
        self.config = Config()
        self.graph = create_graph(self.config)
    
    async def process(self, input_data):
        """
        Process input through the LangGraph
        """
        result = await self.graph.execute(input_data)
        return result
    
    def get_graph_info(self):
        """
        Get information about the graph structure
        """
        return self.graph.get_graph_info()

@tracing(agent="${config.project.name}")
async def main():
    """
    Main application entry point
    """
    print(f"Starting ${config.project.name} (LangGraph)...")
    
    # Initialize agent
    agent = LangGraphAgent()
    
    # Print graph information
    graph_info = agent.get_graph_info()
    print(f"Graph structure: {graph_info}")
    
    # Example usage
    if "${config.runtime.type}" == 'cli':
        # CLI mode
        import sys
        if len(sys.argv) > 1:
            input_data = sys.argv[1]
        else:
            input_data = input("Enter input: ")
        
        result = await agent.process(input_data)
        print(f"Result: {result}")
    
    elif "${config.runtime.type}" == 'worker':
        # Worker mode - implement queue processing
        print("Worker mode - implement your queue processing logic here")
        # TODO: Add queue processing logic
    
    else:
        # Default mode
        print("Running in default mode")
        result = await agent.process("Hello, world!")
        print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Update requirements.txt with LangGraph dependencies
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateRequirements(config, targetPath) {
    const requirementsPath = path.join(targetPath, 'requirements.txt');
    let requirements = await fs.readFile(requirementsPath, 'utf8');

    // Add LangGraph dependencies
    const langgraphDeps = [
      '',
      '# LangGraph dependencies',
      'langgraph>=0.0.20',
      'langchain>=0.1.0',
      'langchain-core>=0.1.0',
      'langchain-community>=0.0.10',
      '',
      '# LLM providers',
      'openai>=1.0.0',
      'ollama>=0.1.0',
      '',
      '# Additional dependencies',
      'networkx>=3.0',
      'pydantic>=2.0.0'
    ];

    requirements += langgraphDeps.join('\n');
    await fs.writeFile(requirementsPath, requirements);
  }
}

module.exports = LangGraphPythonGenerator;
