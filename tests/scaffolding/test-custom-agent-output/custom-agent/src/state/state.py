"""
State definition for Custom Agent LangGraph
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
