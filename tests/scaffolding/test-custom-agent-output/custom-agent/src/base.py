"""
Base classes for Custom Agent nodes
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
