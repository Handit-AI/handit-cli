"""
Simple configuration for Custom Agent
Only includes what's actually needed for the agent to run.
"""

import os
from typing import Dict, Any, List

class Config:
    """
    Simple configuration class - only essential properties.
    The generator handles folder/file structure based on JSON config.
    """
    
    def __init__(self) -> None:
        # Basic project info
        self.project_name: str = "Custom Agent"
        self.framework: str = "langgraph"
        
        # Runtime info
        self.runtime_type: str = "fastapi"
        self.port: int = 8000
        
        # Agent stages (the actual workflow)
        self.agent_stages: List[str] = ["llm_1","llm_2","llm_3"]
        
        # Environment variables (for actual runtime configuration)
        self.handit_api_key = os.getenv("HANDIT_API_KEY")
        self.model_provider = os.getenv("MODEL_PROVIDER", "mock")
        self.model_name = os.getenv("MODEL_NAME", "mock-llm")
    
    def get_model_config(self, node_name: str = None) -> Dict[str, Any]:
        """
        Get model configuration for a node.
        
        Args:
            node_name: Optional node name for node-specific config
            
        Returns:
            Model configuration
        """
        return {
            "provider": self.model_provider,
            "name": self.model_name
        }
    
    def get_node_tools_config(self, node_name: str) -> List[str]:
        """
        Get tools for a specific node.
        
        Args:
            node_name: Name of the node
            
        Returns:
            List of available tools (empty for now - implement as needed)
        """
        # Return empty list by default - tools can be added per node as needed
        return []
