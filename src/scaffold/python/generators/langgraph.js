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

    // Generate base structure first (including node classes)
    await super.generate(config, targetPath);

    // Generate LangGraph-specific files
    await this.generateLangGraphFiles(config, targetPath);

    // Update requirements with LangGraph dependencies
    await this.updateRequirements(config, targetPath);

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

    // Generate base classes
    await this.generateBaseClasses(config, targetPath);

    // Generate agent class file
    await this.generateAgentFile(config, targetPath);

    // Generate checkpointer configuration
    await this.generateCheckpointer(config, targetPath);


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
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from handit_ai import tracing
import asyncio

class GraphExecutionError(Exception):
    """Custom exception for graph execution errors"""
    pass

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
        
        # Define the flow - using state-graph orchestration
        self._add_state_graph_edges(graph)
        
        # Compile the graph with checkpointer
        return graph.compile(
            checkpointer=self._get_checkpointer()
        )
    
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
        
        if not stages:
            return
            
        # Add entrypoint from START to first stage
        graph.add_edge(START, stages[0])
        
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
    
    def _get_checkpointer(self):
        """
        Get checkpointer instance for graph persistence.
        
        Returns:
            Checkpointer instance or None
        """
        try:
            from ..checkpoints import create_checkpointer
            return create_checkpointer()
        except ImportError:
            print("Warning: Checkpointer not available, running without persistence")
            return None
    
    async def execute(self, input_data: Any) -> Any:
        """
        Execute the graph with input data and comprehensive error recovery.
        
        Args:
            input_data: Input data for the graph
            
        Returns:
            Graph execution result
            
        Raises:
            GraphExecutionError: If all recovery attempts fail
        """
        max_retries = 3
        retry_delay = 2.0
        
        for attempt in range(max_retries):
            try:
                # Validate input
                if not self._validate_graph_input(input_data):
                    raise ValueError("Invalid input data for graph execution")
                
                # Prepare initial state
                initial_state = {
                    "input": input_data,
                    "messages": [HumanMessage(content=str(input_data))],
                    "context": {},
                    "results": {},
                    "current_stage": self.config.agent_stages[0] if self.config.agent_stages else None,
                    "error": None,
                    "metadata": {"attempt": attempt + 1, "max_retries": max_retries}
                }
                
                # Execute the graph with timeout
                result = await asyncio.wait_for(
                    self.graph.ainvoke(initial_state),
                    timeout=120.0  # 2 minutes for full graph execution
                )
                
                # Validate result
                if not self._validate_graph_output(result):
                    raise ValueError("Invalid output from graph execution")
                
                return result
                
            except (ValueError, TypeError) as e:
                # Validation errors - don't retry
                print(f"❌ Graph validation error (attempt {attempt + 1}): {e}")
                raise GraphExecutionError(f"Graph validation failed: {e}")
                
            except asyncio.TimeoutError:
                print(f"⏰ Graph execution timeout (attempt {attempt + 1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise GraphExecutionError(f"Graph execution timeout after {max_retries} attempts")
                await asyncio.sleep(retry_delay * (attempt + 1))
                
            except Exception as e:
                print(f"⚠️ Graph execution error (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt == max_retries - 1:
                    error_msg = f"Graph execution failed after {max_retries} attempts: {e}"
                    print(f"❌ {error_msg}")
                    raise GraphExecutionError(error_msg)
                
                # Exponential backoff
                await asyncio.sleep(retry_delay * (2 ** attempt))
        
        raise GraphExecutionError("Unexpected error in graph execution")
    
    def _validate_graph_input(self, input_data: Any) -> bool:
        """Validate input data for graph execution"""
        if input_data is None:
            return False
        
        if isinstance(input_data, str):
            return len(input_data.strip()) > 0 and len(input_data) <= 50000
        elif isinstance(input_data, dict):
            return bool(input_data)
        elif isinstance(input_data, list):
            return len(input_data) > 0 and len(input_data) <= 1000
        
        return True
    
    def _validate_graph_output(self, result: Any) -> bool:
        """Validate output from graph execution"""
        if result is None:
            return False
        
        # Check if result has expected structure
        if isinstance(result, dict):
            # Should have at least some results
            return "results" in result or "messages" in result
        
        return True
    
    def get_graph_info(self) -> Dict[str, Any]:
        """
        Get information about the graph structure.
        
        Returns:
            Graph information dictionary
        """
        return {
            "nodes": list(self.graph.nodes.keys()),
            "edges": list(self.graph.edges.keys()),
            "orchestration_style": "state-graph",
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
   * Generate dynamic node functions based on user configuration
   * @param {Object} config - Configuration object
   * @returns {string} Generated node functions code
   */
  static generateDynamicNodes(config) {
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    const allNodes = [...llmNodes, ...toolNodes];
    
    let nodeCode = '';
    
    // Generate LLM nodes
    for (const nodeName of llmNodes) {
      nodeCode += this.generateLLMNodeFunction(config, nodeName);
    }
    
    // Generate Tool nodes
    for (const nodeName of toolNodes) {
      nodeCode += this.generateToolNodeFunction(config, nodeName);
    }
    
    return nodeCode;
  }

  /**
   * Get LLM node names from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of LLM node names
   */
  static getLLMNodeNames(config) {
    const llmNodes = new Set();
    
    if (Array.isArray(config.llm_nodes)) {
      config.llm_nodes.forEach(node => {
        if (node.node_name) {
          llmNodes.add(node.node_name);
        }
      });
    }
    
    // If no LLM nodes specified, check agent stages
    if (llmNodes.size === 0 && Array.isArray(config.agent && config.agent.stages)) {
      config.agent.stages.forEach(stage => llmNodes.add(stage));
    }
    
    return Array.from(llmNodes);
  }

  /**
   * Get Tool node names from configuration
   * @param {Object} config - Configuration object
   * @returns {Array} Array of tool node names
   */
  static getToolNodeNames(config) {
    const toolNodes = new Set();
    
    if (Array.isArray(config.tools)) {
      config.tools.forEach(tool => {
        if (tool.node_name) {
          toolNodes.add(tool.node_name);
        }
      });
    }
    
    return Array.from(toolNodes);
  }

  /**
   * Generate LLM node function
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @returns {string} Generated node function code
   */
  static generateLLMNodeFunction(config, nodeName) {
    const nodeNameCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    
    return `
async def ${nodeName}_node(state: AgentState) -> AgentState:
    """
    ${nodeNameCapitalized} LLM node with error recovery.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with ${nodeName} results
    """
    max_retries = 3
    retry_delay = 2.0  # Longer delay for LLM calls
    
    for attempt in range(max_retries):
        try:
            clear_error(state)
            
            # Validate input
            if not state.get("input"):
                return set_error(state, "No input data provided for ${nodeName}")
            
            input_data = state["input"]
            
            # Get previous stage results if available
            previous_results = ""
            if state.get("results"):
                # Get the result from the previous stage
                stages = ${JSON.stringify((config.agent && config.agent.stages) || [])}
                current_index = stages.index("${nodeName}") if "${nodeName}" in stages else -1
                if current_index > 0:
                    prev_stage = stages[current_index - 1]
                    previous_results = state["results"].get(prev_stage, "")
            
            # TODO: Implement ${nodeName} LLM logic with timeout
            processing_input = previous_results if previous_results else str(input_data)
            
            # Execute LLM processing with timeout
            result = await asyncio.wait_for(
                _simulate_node_processing("${nodeName}", processing_input, "llm"),
                timeout=60.0  # Longer timeout for LLM calls
            )
            
            # Update state with results
            state = set_stage_result(state, "${nodeName}", result)
            
            # Add AI message
            message = AIMessage(content=f"${nodeNameCapitalized}: {result}")
            state = add_message(state, message)
            
            return state
            
        except asyncio.TimeoutError:
            error_msg = f"${nodeNameCapitalized} LLM timeout (attempt {attempt + 1}/{max_retries})"
            if attempt == max_retries - 1:
                return set_error(state, f"${nodeNameCapitalized} LLM failed after {max_retries} attempts: {error_msg}")
            await asyncio.sleep(retry_delay * (attempt + 1))
            
        except Exception as e:
            error_msg = f"${nodeNameCapitalized} LLM error (attempt {attempt + 1}/{max_retries}): {str(e)}"
            if attempt == max_retries - 1:
                return set_error(state, f"${nodeNameCapitalized} LLM failed after {max_retries} attempts: {error_msg}")
            await asyncio.sleep(retry_delay * (2 ** attempt))
    
    return set_error(state, f"Unexpected error in ${nodeName} LLM node")
`;
  }

  /**
   * Generate Tool node function
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @returns {string} Generated node function code
   */
  static generateToolNodeFunction(config, nodeName) {
    const nodeNameCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    
    return `
async def ${nodeName}_tool_node(state: AgentState) -> AgentState:
    """
    ${nodeNameCapitalized} tool node with error recovery.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with ${nodeName} tool results
    """
    max_retries = 3
    retry_delay = 1.0  # Shorter delay for tool calls
    
    for attempt in range(max_retries):
        try:
            clear_error(state)
            
            # Validate input
            if not state.get("input"):
                return set_error(state, "No input data provided for ${nodeName} tool")
            
            input_data = state["input"]
            
            # Get previous stage results if available
            previous_results = ""
            if state.get("results"):
                # Get the result from the previous stage
                stages = ${JSON.stringify((config.agent && config.agent.stages) || [])}
                current_index = stages.index("${nodeName}") if "${nodeName}" in stages else -1
                if current_index > 0:
                    prev_stage = stages[current_index - 1]
                    previous_results = state["results"].get(prev_stage, "")
            
            # TODO: Implement ${nodeName} tool logic with timeout
            processing_input = previous_results if previous_results else str(input_data)
            
            # Execute tool processing with timeout
            result = await asyncio.wait_for(
                _simulate_node_processing("${nodeName}", processing_input, "tool"),
                timeout=30.0  # Shorter timeout for tool calls
            )
            
            # Update state with results
            state = set_stage_result(state, "${nodeName}", result)
            
            # Add AI message
            message = AIMessage(content=f"${nodeNameCapitalized} Tool: {result}")
            state = add_message(state, message)
            
            return state
            
        except asyncio.TimeoutError:
            error_msg = f"${nodeNameCapitalized} tool timeout (attempt {attempt + 1}/{max_retries})"
            if attempt == max_retries - 1:
                return set_error(state, f"${nodeNameCapitalized} tool failed after {max_retries} attempts: {error_msg}")
            await asyncio.sleep(retry_delay * (attempt + 1))
            
        except Exception as e:
            error_msg = f"${nodeNameCapitalized} tool error (attempt {attempt + 1}/{max_retries}): {str(e)}"
            if attempt == max_retries - 1:
                return set_error(state, f"${nodeNameCapitalized} tool failed after {max_retries} attempts: {error_msg}")
            await asyncio.sleep(retry_delay * (2 ** attempt))
    
    return set_error(state, f"Unexpected error in ${nodeName} tool node")
`;
  }

  /**
   * Generate node imports for graph nodes
   * @param {Object} config - Configuration object
   * @returns {string} Generated import statements
   */
  static generateNodeImports(config) {
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    
    let imports = '';
    
    // Add LLM node imports
    for (const nodeName of llmNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'LLMNode';
      imports += `from ...nodes.llm.${nodeName}.processor import ${className}\n`;
    }
    
    // Add Tool node imports
    for (const nodeName of toolNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'ToolNode';
      imports += `from ...nodes.tools.${nodeName}.processor import ${className}\n`;
    }
    
    return imports;
  }

  /**
   * Get first LLM node name for fallback
   * @param {Object} config - Configuration object
   * @returns {string} First LLM node name
   */
  static getFirstLLMNode(config) {
    const llmNodes = this.getLLMNodeNames(config);
    return llmNodes.length > 0 ? llmNodes[0] : 'process';
  }

  /**
   * Get first LLM node class name for fallback
   * @param {Object} config - Configuration object
   * @returns {string} First LLM node class name
   */
  static getFirstLLMNodeClass(config) {
    const nodeName = this.getFirstLLMNode(config);
    return nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'LLMNode';
  }

  /**
   * Get first Tool node name for fallback
   * @param {Object} config - Configuration object
   * @returns {string} First Tool node name
   */
  static getFirstToolNode(config) {
    const toolNodes = this.getToolNodeNames(config);
    return toolNodes.length > 0 ? toolNodes[0] : 'process';
  }

  /**
   * Get first Tool node class name for fallback
   * @param {Object} config - Configuration object
   * @returns {string} First Tool node class name
   */
  static getFirstToolNodeClass(config) {
    const nodeName = this.getFirstToolNode(config);
    return nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'ToolNode';
  }

  /**
   * Generate LangGraph node wrappers that call node classes
   * @param {Object} config - Configuration object
   * @returns {string} Generated wrapper functions
   */
  static generateLangGraphNodeWrappers(config) {
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    
    let wrappers = '';
    
    // Generate LLM node wrappers
    for (const nodeName of llmNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'LLMNode';
      wrappers += this.generateLLMNodeWrapper(config, nodeName, className);
    }
    
    // Generate Tool node wrappers
    for (const nodeName of toolNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'ToolNode';
      wrappers += this.generateToolNodeWrapper(config, nodeName, className);
    }
    
    return wrappers;
  }

  /**
   * Generate LLM node wrapper function
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @param {string} className - Class name
   * @returns {string} Generated wrapper function
   */
  static generateLLMNodeWrapper(config, nodeName, className) {
    const nodeNameCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    
    return `
async def ${nodeName}_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for ${nodeNameCapitalized} LLM node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with ${nodeName} results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("${nodeName}", "llm")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ${JSON.stringify((config.agent && config.agent.stages) || [])}
            current_index = stages.index("${nodeName}") if "${nodeName}" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "${nodeName}", result)
        
        # Add AI message
        message = AIMessage(content=f"${nodeNameCapitalized}: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"${nodeNameCapitalized} node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)
`;
  }

  /**
   * Generate Tool node wrapper function
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @param {string} className - Class name
   * @returns {string} Generated wrapper function
   */
  static generateToolNodeWrapper(config, nodeName, className) {
    const nodeNameCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    
    return `
async def ${nodeName}_tool_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for ${nodeNameCapitalized} tool node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with ${nodeName} tool results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("${nodeName}", "tool")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ${JSON.stringify((config.agent && config.agent.stages) || [])}
            current_index = stages.index("${nodeName}") if "${nodeName}" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "${nodeName}", result)
        
        # Add AI message
        message = AIMessage(content=f"${nodeNameCapitalized} Tool: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"${nodeNameCapitalized} tool node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)
`;
  }

  /**
   * Generate node function mapping code
   * @param {Object} config - Configuration object
   * @param {string} nodeType - Type of nodes ('llm' or 'tool')
   * @returns {string} Generated mapping code
   */
  static generateNodeFunctionMapping(config, nodeType) {
    const nodeNames = nodeType === 'llm' ? this.getLLMNodeNames(config) : this.getToolNodeNames(config);
    let mappingCode = '';
    
    for (const nodeName of nodeNames) {
      const functionName = nodeType === 'llm' ? `${nodeName}_node` : `${nodeName}_tool_node`;
      mappingCode += `    node_functions["${nodeName}"] = ${functionName}\n`;
    }
    
    return mappingCode;
  }

  /**
   * Generate graph nodes that wrap node classes
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateGraphNodes(config, targetPath) {
    const nodesPath = path.join(targetPath, 'src/graph/nodes');
    await fs.ensureDir(nodesPath);

    const nodesContent = `"""
Graph orchestration for ${config.project.name} LangGraph
This file handles how nodes interact with each other and wraps node classes as LangGraph functions.
"""

from typing import Dict, Any, Callable
from langchain_core.messages import AIMessage
from handit_ai import tracing
import asyncio

from ...config import Config
from ...state import AgentState, set_stage_result, add_message, set_error, clear_error

# Import node classes from /src/nodes/
${this.generateNodeImports(config)}

# Global node instances (initialized once)
_node_instances = {}

def _get_node_instance(node_name: str, node_type: str = "llm"):
    """
    Get or create a node instance (singleton pattern).
    
    Args:
        node_name: Name of the node
        node_type: Type of node ('llm' or 'tool')
        
    Returns:
        Node instance
    """
    global _node_instances
    key = f"{node_name}_{node_type}"
    
    if key not in _node_instances:
        config = Config()
        if node_type == "llm":
            # Dynamic import for LLM nodes
            class_name = f"{node_name.title()}LLMNode"
            module_path = f"...nodes.llm.{node_name}.processor"
            module = __import__(module_path, fromlist=[class_name])
            node_class = getattr(module, class_name)
            _node_instances[key] = node_class(config)
        else:
            # Dynamic import for Tool nodes
            class_name = f"{node_name.title()}ToolNode"
            module_path = f"...nodes.tools.{node_name}.processor"
            module = __import__(module_path, fromlist=[class_name])
            node_class = getattr(module, class_name)
            _node_instances[key] = node_class(config)
    
    return _node_instances[key]

# LangGraph node functions that wrap node classes
${this.generateLangGraphNodeWrappers(config)}

def get_graph_nodes(config: Config) -> Dict[str, Callable]:
    """
    Get graph nodes based on configuration.
    Dynamically returns nodes based on user's LLM and tool node configuration.
    
    Args:
        config: Configuration object
        
    Returns:
        Dictionary of node functions
    """
    node_functions = {}
    
    # Add LLM nodes
${this.generateNodeFunctionMapping(config, 'llm')}
    
    # Add Tool nodes  
${this.generateNodeFunctionMapping(config, 'tool')}
    
    # Return only the nodes that are in the agent stages
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
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    
    const nodeExports = [];
    const nodeImports = [];
    
    // Add LLM node wrapper exports
    for (const nodeName of llmNodes) {
      const functionName = `${nodeName}_node`;
      nodeImports.push(functionName);
      nodeExports.push(`"${functionName}"`);
    }
    
    // Add Tool node wrapper exports
    for (const nodeName of toolNodes) {
      const functionName = `${nodeName}_tool_node`;
      nodeImports.push(functionName);
      nodeExports.push(`"${functionName}"`);
    }
    
    // Add common exports
    nodeImports.push('get_graph_nodes', '_get_node_instance');
    nodeExports.push('"get_graph_nodes"', '"_get_node_instance"');
    
    const nodesInitContent = `"""
Graph orchestration for ${config.project.name}
This module contains LangGraph wrapper functions that call node classes from /src/nodes/
"""

from .nodes import (
    ${nodeImports.join(',\n    ')}
)

__all__ = [
    ${nodeExports.join(',\n    ')}
]
`;

    await fs.writeFile(path.join(nodesPath, '__init__.py'), nodesInitContent);
  }

  /**
   * Generate base classes for nodes
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateBaseClasses(config, targetPath) {
    const baseClassContent = `"""
Base classes for ${config.project.name} nodes
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from .config import Config

class BaseNode(ABC):
    """
    Abstract base class for all nodes in the agent system
    """
    
    def __init__(self, config: Config, node_name: str):
        """
        Initialize the base node
        
        Args:
            config: Configuration object
            node_name: Name of this node
        """
        self.config = config
        self.node_name = node_name
        self.stage = node_name
    
    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        """
        Run the node's main logic
        
        Args:
            input_data: Input data to process
            
        Returns:
            Processed output data
        """
        pass
    
    def validate_input(self, data: Any) -> bool:
        """
        Validate input data for this node
        
        Args:
            data: Input data to validate
            
        Returns:
            True if input is valid, False otherwise
        """
        return data is not None
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this node
        
        Returns:
            Dictionary containing node metadata
        """
        return {
            "node_name": self.node_name,
            "stage": self.stage,
            "type": self.__class__.__name__
        }

class BaseLLMNode(BaseNode):
    """
    Abstract base class for LLM nodes
    """
    
    def __init__(self, config: Config, node_name: str):
        super().__init__(config, node_name)
        self.model_config = self.config.get_node_model_config(node_name)
        
        # Import prompts dynamically
        try:
            from .prompts import get_prompts, get_node_specific_prompts
            self.prompts = get_prompts()
            self.node_prompts = get_node_specific_prompts(node_name)
        except ImportError:
            self.prompts = {}
            self.node_prompts = {}
    
    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        """
        Run the LLM node's logic
        This method should call the AI system with the appropriate prompts
        
        Args:
            input_data: Input data to process with LLM
            
        Returns:
            LLM-processed output data
        """
        pass
    
    async def call_llm(self, prompt: str, input_data: Any) -> Any:
        """
        Call the LLM with the given prompt and input
        Override this method to implement your specific LLM integration
        
        Args:
            prompt: The prompt to send to the LLM
            input_data: The input data to include in the prompt
            
        Returns:
            LLM response
        """
        # TODO: Implement your LLM integration here
        # Example integrations:
        # - OpenAI API
        # - Ollama
        # - Anthropic Claude
        # - Local models
        
        return f"LLM response for {self.node_name} with prompt: {prompt[:50]}..."
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the configured model
        
        Returns:
            Model configuration dictionary
        """
        return self.model_config

class BaseToolNode(BaseNode):
    """
    Abstract base class for tool nodes
    """
    
    def __init__(self, config: Config, node_name: str):
        super().__init__(config, node_name)
        self.available_tools = self.config.get_node_tools_config(node_name)
    
    @abstractmethod
    async def run(self, input_data: Any) -> Any:
        """
        Run the tool node's logic
        This method should execute the specific tool action
        
        Args:
            input_data: Input data to process with tools
            
        Returns:
            Tool execution result
        """
        pass
    
    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Any:
        """
        Execute a specific tool with parameters
        Override this method to implement your specific tool integrations
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Parameters for the tool execution
            
        Returns:
            Tool execution result
        """
        # TODO: Implement your tool integrations here
        # Example tools:
        # - HTTP requests (http_fetch)
        # - Web search (web_search)
        # - Calculator (calculator)
        # - File operations (file_io)
        # - Code execution (code_run)
        
        return f"Tool {tool_name} executed for {self.node_name} with parameters: {parameters}"
    
    def get_tools_info(self) -> List[str]:
        """
        Get information about available tools
        
        Returns:
            List of available tool names
        """
        return self.available_tools
`;

    await fs.writeFile(path.join(targetPath, 'src/base.py'), baseClassContent);
  }

  /**
   * Generate agent class file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateAgentFile(config, targetPath) {
    const agentContent = `"""
${config.project.name} LangGraph Agent
"""

from typing import Dict, Any
from handit_ai import tracing

from .config import Config
from .graph import create_graph

class LangGraphAgent:
    """
    Main LangGraph agent class that orchestrates the graph execution
    """
    
    def __init__(self, config: Config = None, graph = None):
        """
        Initialize the LangGraph agent
        
        Args:
            config: Configuration object (optional, will create default if not provided)
            graph: Pre-initialized graph (optional, will create from config if not provided)
        """
        self.config = config or Config()
        self.graph = graph or create_graph(self.config)
    
    async def process(self, input_data: str) -> Any:
        """
        Process input through the LangGraph
        
        Args:
            input_data: Input data to process
            
        Returns:
            Processed result from the graph
            
        Raises:
            Exception: If processing fails
        """
        try:
            result = await self.graph.execute(input_data)
            return result
        except Exception as e:
            print(f"❌ Error processing request: {e}")
            raise
    
    def get_graph_info(self) -> Dict[str, Any]:
        """
        Get information about the graph structure
        
        Returns:
            Dictionary containing graph structure information
        """
        try:
            return self.graph.get_graph_info()
        except Exception as e:
            return {
                "error": f"Could not retrieve graph info: {str(e)}",
                "agent": "${config.project.name}",
                "framework": "langgraph"
            }
    
    def get_agent_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this agent
        
        Returns:
            Dictionary containing agent metadata
        """
        return {
            "name": "${config.project.name}",
            "framework": "langgraph",
            "language": "python",
            "runtime": "${config.runtime.type}",
            "version": "1.0.0"
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the agent
        
        Returns:
            Dictionary containing health status
        """
        try:
            # Test basic functionality
            graph_info = self.get_graph_info()
            
            return {
                "status": "healthy",
                "agent": "${config.project.name}",
                "framework": "langgraph",
                "graph_available": "error" not in graph_info,
                "config_loaded": self.config is not None
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "agent": "${config.project.name}",
                "framework": "langgraph",
                "error": str(e)
            }
`;

    await fs.writeFile(path.join(targetPath, 'src/agent.py'), agentContent);
  }

  /**
   * Generate checkpointer configuration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateCheckpointer(config, targetPath) {
    const checkpointsPath = path.join(targetPath, 'src/checkpoints');
    await fs.ensureDir(checkpointsPath);

    const checkpointerContent = `"""
Checkpointer configuration for ${config.project.name} LangGraph
Provides persistence and state management for graph execution
"""

import os
from typing import Optional
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.memory import MemorySaver

def create_checkpointer() -> Optional[SqliteSaver]:
    """
    Create checkpointer instance for graph persistence.
    
    Returns:
        Checkpointer instance or None if not configured
    """
    # Check if checkpointer is enabled via environment variable
    if os.getenv("ENABLE_CHECKPOINTER", "true").lower() == "false":
        return None
    
    try:
        # Use SQLite for persistence
        db_path = os.getenv("CHECKPOINTER_DB_PATH", "checkpoints.db")
        return SqliteSaver.from_conn_string(db_path)
    except Exception as e:
        print(f"Warning: Could not create SQLite checkpointer: {e}")
        # Fallback to memory checkpointer
        return MemorySaver()

def create_memory_checkpointer() -> MemorySaver:
    """
    Create in-memory checkpointer for testing or temporary use.
    
    Returns:
        Memory checkpointer instance
    """
    return MemorySaver()

def get_thread_config(user_id: str, session_id: str = None) -> dict:
    """
    Generate thread configuration for user isolation.
    
    Args:
        user_id: User identifier
        session_id: Optional session identifier
        
    Returns:
        Thread configuration dictionary
    """
    thread_id = f"user_{user_id}"
    if session_id:
        thread_id += f"_session_{session_id}"
    
    return {"configurable": {"thread_id": thread_id}}

def get_versioned_thread_config(user_id: str, version: str = "v1.0.0", session_id: str = None) -> dict:
    """
    Generate versioned thread configuration.
    
    Args:
        user_id: User identifier
        version: Graph version
        session_id: Optional session identifier
        
    Returns:
        Versioned thread configuration dictionary
    """
    base_thread_id = f"user_{user_id}"
    if session_id:
        base_thread_id += f"_session_{session_id}"
    
    thread_id = f"{base_thread_id}_v{version}"
    return {"configurable": {"thread_id": thread_id}}

class CheckpointerManager:
    """
    Manager class for checkpointer operations.
    """
    
    def __init__(self):
        self.checkpointer = create_checkpointer()
    
    def is_enabled(self) -> bool:
        """
        Check if checkpointer is enabled.
        
        Returns:
            True if checkpointer is available and enabled
        """
        return self.checkpointer is not None
    
    def get_checkpointer(self):
        """
        Get the checkpointer instance.
        
        Returns:
            Checkpointer instance or None
        """
        return self.checkpointer
    
    def create_user_thread(self, user_id: str, session_id: str = None) -> dict:
        """
        Create thread configuration for a user.
        
        Args:
            user_id: User identifier
            session_id: Optional session identifier
            
        Returns:
            Thread configuration
        """
        return get_thread_config(user_id, session_id)
    
    def create_versioned_thread(self, user_id: str, version: str = "v1.0.0", session_id: str = None) -> dict:
        """
        Create versioned thread configuration.
        
        Args:
            user_id: User identifier
            version: Graph version
            session_id: Optional session identifier
            
        Returns:
            Versioned thread configuration
        """
        return get_versioned_thread_config(user_id, version, session_id)
`;

    await fs.writeFile(path.join(checkpointsPath, 'checkpointer.py'), checkpointerContent);

    // Generate __init__.py for checkpoints
    const checkpointsInitContent = `"""
Checkpointer management for ${config.project.name}
"""

from .checkpointer import (
    create_checkpointer,
    create_memory_checkpointer,
    get_thread_config,
    get_versioned_thread_config,
    CheckpointerManager
)

__all__ = [
    "create_checkpointer",
    "create_memory_checkpointer", 
    "get_thread_config",
    "get_versioned_thread_config",
    "CheckpointerManager"
]
`;

    await fs.writeFile(path.join(checkpointsPath, '__init__.py'), checkpointsInitContent);
  }

  /**
   * Update main.py for LangGraph integration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateMainFile(config, targetPath) {
    // Generate different main.py based on runtime type
    if (config.runtime.type === 'fastapi') {
      await this.generateFastAPIMain(config, targetPath);
    } else if (config.runtime.type === 'cli') {
      await this.generateCLIMain(config, targetPath);
    } else if (config.runtime.type === 'worker') {
      await this.generateWorkerMain(config, targetPath);
    } else {
      await this.generateDefaultMain(config, targetPath);
    }
  }

  /**
   * Generate FastAPI main.py following best practices
   */
  static async generateFastAPIMain(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
FastAPI application for ${config.project.name} (LangGraph)
Following FastAPI best practices for production deployment
"""

import os
from typing import Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.agent import LangGraphAgent

# Global agent instance
agent = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global agent
    
    # Startup
    print(f"🚀 Starting ${config.project.name} (LangGraph + FastAPI)")
    
    # Initialize agent
    agent = LangGraphAgent()
    
    # Print graph information
    graph_info = agent.get_graph_info()
    print(f"📊 Graph structure: {graph_info}")
    print(f"✅ ${config.project.name} initialized successfully")
    
    yield
    
    # Shutdown
    print(f"🔄 Shutting down ${config.project.name}")

# Create FastAPI app with lifespan
app = FastAPI(
    title="${config.project.name}",
    description="LangGraph-powered AI agent API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0"]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost,http://localhost:3000,http://localhost:8000").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Request/Response Models
class ProcessRequest(BaseModel):
    input_data: str = Field(..., description="Input data to process", min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "input_data": "Hello, how can you help me today?",
                "metadata": {"user_id": "user123", "session_id": "session456"}
            }
        }

class ProcessResponse(BaseModel):
    result: Any = Field(..., description="Processing result")
    success: bool = Field(..., description="Whether processing was successful")
    metadata: Dict[str, Any] = Field(..., description="Response metadata")
    
    class Config:
        schema_extra = {
            "example": {
                "result": "I can help you with various tasks...",
                "success": True,
                "metadata": {
                    "agent": "${config.project.name}",
                    "framework": "langgraph",
                    "processing_time_ms": 150
                }
            }
        }

class HealthResponse(BaseModel):
    status: str = Field(..., description="Health status")
    agent: str = Field(..., description="Agent name")
    framework: str = Field(..., description="Framework used")
    uptime: str = Field(..., description="Application uptime")

class GraphInfoResponse(BaseModel):
    graph_info: Dict[str, Any] = Field(..., description="Graph structure information")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# API Routes
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to ${config.project.name} API",
        "framework": "langgraph",
        "docs": "/docs",
        "health": "/health"
    }

@app.post("/process", response_model=ProcessResponse, tags=["Agent"])
@tracing(agent="${config.project.name}")
async def process_endpoint(request: ProcessRequest):
    """
    Main processing endpoint - sends input through the LangGraph agent
    This is the main entry point for agent execution, so it has tracing.
    """
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    try:
        import time
        start_time = time.time()
        
        result = await agent.process(request.input_data)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return ProcessResponse(
            result=result,
            success=True,
            metadata={
                "agent": "${config.project.name}",
                "framework": "langgraph",
                "processing_time_ms": round(processing_time, 2),
                **request.metadata
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    import time
    uptime = time.time() - start_time if 'start_time' in globals() else 0
    
    return HealthResponse(
        status="healthy",
        agent="${config.project.name}",
        framework="langgraph",
        uptime=f"{uptime:.2f} seconds"
    )

@app.get("/graph/info", response_model=GraphInfoResponse, tags=["Graph"])
async def graph_info():
    """Get graph structure information"""
    if not agent:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    
    return GraphInfoResponse(
        graph_info=agent.get_graph_info()
    )

# Development server
if __name__ == "__main__":
    import time
    start_time = time.time()
    
    port = ${config.runtime.port || 8000}
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"🌐 Starting ${config.project.name} FastAPI server")
    print(f"📍 Server will be available at: http://{host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs")
    print(f"🔍 Alternative docs: http://{host}:{port}/redoc")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Generate CLI main.py
   */
  static async generateCLIMain(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
CLI application for ${config.project.name} (LangGraph)
"""

import asyncio
import sys
import os
from dotenv import load_dotenv
from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.agent import LangGraphAgent

@tracing(agent="${config.project.name}")
async def main():
    """CLI main function - main entry point for agent execution"""
    print(f"🚀 Starting ${config.project.name} (LangGraph CLI)")
    
    # Initialize agent
    agent = LangGraphAgent()
    
    # Get input from command line or prompt
    if len(sys.argv) > 1:
        input_data = " ".join(sys.argv[1:])
        print(f"📝 Processing: {input_data}")
    else:
        input_data = input("💬 Enter your input: ")
    
    try:
        result = await agent.process(input_data)
        print(f"✅ Result: {result}")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Generate Worker main.py
   */
  static async generateWorkerMain(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
Worker application for ${config.project.name} (LangGraph)
"""

import asyncio
import os
import signal
import sys
from dotenv import load_dotenv
from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.agent import LangGraphAgent

class Worker:
    def __init__(self):
        self.agent = LangGraphAgent()
        self.running = True
    
    def stop(self):
        """Stop the worker"""
        self.running = False
        print("🛑 Worker stopping...")
    
    async def run(self):
        """Main worker loop"""
        print(f"🚀 Starting ${config.project.name} Worker (LangGraph)")
        print("📊 Graph info:", self.agent.get_graph_info())
        
        while self.running:
            try:
                # TODO: Implement your queue processing logic here
                # Example implementations:
                # - Redis queue processing
                # - RabbitMQ message processing
                # - Database job polling
                # - File system monitoring
                
                print("⏳ Waiting for work... (implement queue processing)")
                await asyncio.sleep(5)  # Replace with actual queue polling
                
            except Exception as e:
                print(f"❌ Worker error: {e}")
                await asyncio.sleep(1)

@tracing(agent="${config.project.name}")
async def main():
    """Worker main function - main entry point for agent execution"""
    worker = Worker()
    
    # Handle graceful shutdown
    def signal_handler(signum, frame):
        print(f"\\n📡 Received signal {signum}")
        worker.stop()
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        await worker.run()
    except KeyboardInterrupt:
        worker.stop()
    
    print("✅ Worker stopped")

if __name__ == "__main__":
    asyncio.run(main())
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Generate Default main.py
   */
  static async generateDefaultMain(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
Default application for ${config.project.name} (LangGraph)
"""

import asyncio
import os
from dotenv import load_dotenv
from handit_ai import configure, tracing

# Load environment variables
load_dotenv()

# Configure Handit
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

from src.agent import LangGraphAgent

@tracing(agent="${config.project.name}")
async def main():
    """Default main function - main entry point for agent execution"""
    print(f"🚀 Starting ${config.project.name} (LangGraph)")
    
    # Initialize agent
    agent = LangGraphAgent()
    
    # Print graph information
    graph_info = agent.get_graph_info()
    print(f"📊 Graph structure: {graph_info}")
    
    # Example processing
    test_input = "Hello, world!"
    print(f"📝 Processing: {test_input}")
    
    try:
        result = await agent.process(test_input)
        print(f"✅ Result: {result}")
    except Exception as e:
        print(f"❌ Error: {e}")

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
