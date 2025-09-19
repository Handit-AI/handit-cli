"""
Graph orchestration for Custom Agent LangGraph
This file handles how nodes interact with each other and wraps node classes as LangGraph functions.
"""

from typing import Dict, Any, Callable
from langchain_core.messages import AIMessage
from handit_ai import tracing
import asyncio

from ...config import Config
from ...state import AgentState, set_stage_result, add_message, set_error, clear_error

# Import node classes from /src/nodes/
from ...nodes.llm.llm_1.processor import Llm_1LLMNode
from ...nodes.llm.llm_2.processor import Llm_2LLMNode
from ...nodes.llm.llm_3.processor import Llm_3LLMNode
from ...nodes.tools.llm_1.processor import Llm_1ToolNode
from ...nodes.tools.llm_2.processor import Llm_2ToolNode
from ...nodes.tools.llm_3.processor import Llm_3ToolNode


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

async def llm_1_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_1 LLM node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_1 results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_1", "llm")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_1") if "llm_1" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_1", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_1: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_1 node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)

async def llm_2_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_2 LLM node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_2 results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_2", "llm")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_2") if "llm_2" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_2", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_2: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_2 node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)

async def llm_3_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_3 LLM node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_3 results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_3", "llm")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_3") if "llm_3" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_3", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_3: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_3 node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)

async def llm_1_tool_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_1 tool node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_1 tool results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_1", "tool")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_1") if "llm_1" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_1", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_1 Tool: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_1 tool node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)

async def llm_2_tool_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_2 tool node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_2 tool results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_2", "tool")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_2") if "llm_2" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_2", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_2 Tool: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_2 tool node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)

async def llm_3_tool_node(state: AgentState) -> AgentState:
    """
    LangGraph wrapper for Llm_3 tool node.
    This function handles graph orchestration and calls the actual node class.
    
    Args:
        state: Current agent state
        
    Returns:
        Updated state with llm_3 tool results
    """
    try:
        # Get node instance (singleton)
        node_instance = _get_node_instance("llm_3", "tool")
        
        # Get input data for processing
        input_data = state.get("input", "")
        
        # Get previous stage results if available
        previous_results = ""
        if state.get("results"):
            stages = ["llm_1","llm_2","llm_3"]
            current_index = stages.index("llm_3") if "llm_3" in stages else -1
            if current_index > 0:
                prev_stage = stages[current_index - 1]
                previous_results = state["results"].get(prev_stage, "")
        
        # Prepare input for the node class
        processing_input = previous_results if previous_results else str(input_data)
        
        # Call the actual node class
        result = await node_instance.run(processing_input)
        
        # Update state with results
        state = set_stage_result(state, "llm_3", result)
        
        # Add AI message
        message = AIMessage(content=f"Llm_3 Tool: {result}")
        state = add_message(state, message)
        
        return state
        
    except Exception as e:
        error_msg = f"Llm_3 tool node error: {str(e)}"
        print(f"❌ {error_msg}")
        return set_error(state, error_msg)


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
    node_functions["llm_1"] = llm_1_node
    node_functions["llm_2"] = llm_2_node
    node_functions["llm_3"] = llm_3_node

    
    # Add Tool nodes  
    node_functions["llm_1"] = llm_1_tool_node
    node_functions["llm_2"] = llm_2_tool_node
    node_functions["llm_3"] = llm_3_tool_node

    
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
