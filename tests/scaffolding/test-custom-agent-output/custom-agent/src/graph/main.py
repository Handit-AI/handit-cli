"""
Main LangGraph for Custom Agent
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

@tracing(agent="Custom Agent_graph")
class CustomAgentGraph:
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

def create_graph(config: Config) -> CustomAgentGraph:
    """
    Create and return a configured graph instance.
    
    Args:
        config: Configuration object
        
    Returns:
        Configured graph instance
    """
    return CustomAgentGraph(config)
