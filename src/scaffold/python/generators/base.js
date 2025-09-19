const fs = require('fs-extra');
const path = require('path');


/**
 * Base Python generator for creating Python agent projects
 */
class BasePythonGenerator {
  /**
   * Generate dynamic imports for nodes
   * @param {Object} config - Configuration object
   * @returns {string} Generated import statements
   */
  static generateDynamicImports(config) {
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    
    let imports = '';
    
    // Add LLM node imports
    for (const nodeName of llmNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'Logic';
      imports += `from src.nodes.llm.${nodeName}.processor import ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}LLMNode\\n`;
    }
    
    // Add Tool node imports
    for (const nodeName of toolNodes) {
      imports += `from src.nodes.tools.${nodeName}.processor import ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}ToolNode\\n`;
    }
    
    return imports;
  }

  /**
   * Generate dynamic node initialization
   * @param {Object} config - Configuration object
   * @returns {string} Generated node initialization code
   */
  static generateDynamicNodeInitialization(config) {
    const llmNodes = this.getLLMNodeNames(config);
    const toolNodes = this.getToolNodeNames(config);
    
    let initCode = '';
    
    // Add LLM node initialization
    for (const nodeName of llmNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'LLMNode';
      initCode += `        self.nodes['${nodeName}'] = ${className}(self.config)\\n`;
    }
    
    // Add Tool node initialization
    for (const nodeName of toolNodes) {
      const className = nodeName.charAt(0).toUpperCase() + nodeName.slice(1) + 'ToolNode';
      initCode += `        self.nodes['${nodeName}'] = ${className}(self.config)\\n`;
    }
    
    return initCode;
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
    
    // If no LLM nodes specified, use agent stages or create minimal default
    if (llmNodes.size === 0) {
      if (Array.isArray(config.agent && config.agent.stages) && config.agent.stages.length > 0) {
        config.agent.stages.forEach(stage => llmNodes.add(stage));
      } else {
        llmNodes.add('process');
      }
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
   * Get tools array from config (handles both new and legacy structure)
   * @param {Object} config - Configuration object
   * @returns {Array} Array of tool names
   */
  static getToolsArray(config) {
    if (!config.tools) {
      return []; // No tools specified
    }
    
    if (Array.isArray(config.tools)) {
      // New structure: extract all tools from all nodes
      const allTools = new Set();
      for (const toolNode of config.tools) {
        if (toolNode.selected && Array.isArray(toolNode.selected)) {
          toolNode.selected.forEach(tool => allTools.add(tool));
        }
      }
      return Array.from(allTools);
    } else if (config.tools && config.tools.selected) {
      // Legacy structure
      return config.tools.selected;
    }
    return [];
  }

  /**
   * Generate a base Python project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {
    console.log('🐍 Generating base Python project...');

    // Generate main application file
    await this.generateMainFile(config, targetPath);

    // Generate configuration file
    await this.generateConfigFile(config, targetPath);

    // Generate node files
    await this.generateNodes(config, targetPath);

    // Generate requirements.txt
    await this.generateRequirements(config, targetPath);

    // Generate utils
    await this.generateUtils(config, targetPath);

    console.log('✅ Base Python project generated');
  }

  /**
   * Generate main application file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
Main application entry point for ${config.project.name}
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
${this.generateDynamicImports(config)}

class AgentPipeline:
    def __init__(self):
        self.config = Config()
        self.nodes = {}
        ${this.generateDynamicNodeInitialization(config)}
    
    async def process(self, input_data):
        """
        Process input through the agent pipeline
        """
        result = input_data
        
        # Execute each stage in sequence
        for stage in self.config.agent_stages:
            print(f"Executing stage: {stage}")
            result = await self.nodes[stage].execute(result)
        
        return result

@tracing(agent="${config.project.name}")
async def main():
    """
    Main application entry point
    """
    try:
        print(f"Starting ${config.project.name}...")
        
        # Initialize agent
        agent = AgentPipeline()
        
        # Runtime-specific initialization
        if "${(config.runtime && config.runtime.type) || 'cli'}" == 'fastapi':
            # FastAPI mode - start web server
            from fastapi import FastAPI, HTTPException
            from pydantic import BaseModel
            import uvicorn
            
            app = FastAPI(title="${config.project.name}", version="1.0.0")
            
            class ProcessRequest(BaseModel):
                input_data: str
                metadata: dict = {}
            
            class ProcessResponse(BaseModel):
                result: str
                success: bool
                metadata: dict = {}
            
            @app.post("/process", response_model=ProcessResponse)
            async def process_endpoint(request: ProcessRequest):
                """Main processing endpoint"""
                try:
                    result = await agent.process(request.input_data)
                    return ProcessResponse(
                        result=str(result),
                        success=True,
                        metadata={"agent": "${config.project.name}"}
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
            
            @app.get("/health")
            async def health_check():
                """Health check endpoint"""
                return {"status": "healthy", "agent": "${config.project.name}"}
            
            # Start the server
            port = ${(config.runtime && config.runtime.port) || 8000}
            print(f"Starting FastAPI server on port {port}")
            uvicorn.run(app, host="0.0.0.0", port=port)
        
        elif "${(config.runtime && config.runtime.type) || 'cli'}" == 'cli':
            # CLI mode
            import sys
            if len(sys.argv) > 1:
                input_data = sys.argv[1]
            else:
                input_data = input("Enter input: ")
            
            result = await agent.process(input_data)
            print(f"Result: {result}")
        
        elif "${(config.runtime && config.runtime.type) || 'cli'}" == 'worker':
            # Worker mode - implement queue processing
            print("Worker mode - implement your queue processing logic here")
            # TODO: Add queue processing logic
            # Example: Redis queue, Celery, or other message queue
        
        else:
            # Default mode (fallback)
            print("Running in default mode")
            result = await agent.process("Hello, world!")
            print(f"Result: {result}")
    
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Generate configuration file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateConfigFile(config, targetPath) {
    const configContent = `"""
Simple configuration for ${config.project.name}
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
        self.project_name: str = "${config.project.name}"
        self.framework: str = "${config.project.framework}"
        
        # Runtime info
        self.runtime_type: str = "${(config.runtime && config.runtime.type) || 'cli'}"
        self.port: int = ${(config.runtime && config.runtime.port) || 8000}
        
        # Agent stages (the actual workflow)
        self.agent_stages: List[str] = ${JSON.stringify((config.agent && config.agent.stages) || ['process'])}
        
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
`;

    await fs.writeFile(path.join(targetPath, 'src/config.py'), configContent);
  }

  /**
   * Generate node files for each stage
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateNodes(config, targetPath) {
    // Generate tool nodes
    await this.generateToolNodes(config, targetPath);
    
    // Generate LLM nodes
    await this.generateLLMNodes(config, targetPath);
  }

  /**
   * Generate tool nodes (no prompts, only logic)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateToolNodes(config, targetPath) {
    const toolNodesPath = path.join(targetPath, 'src/nodes/tools');
    await fs.ensureDir(toolNodesPath);
    
    // Extract tool node names
    const toolNodes = new Set();
    if (Array.isArray(config.tools)) {
      config.tools.forEach(tool => {
        if (tool.node_name) {
          toolNodes.add(tool.node_name);
        }
      });
    }
    
    // Generate tool node files
    for (const nodeName of toolNodes) {
      await this.generateToolNodeFiles(config, targetPath, nodeName);
    }
  }

  /**
   * Generate LLM nodes (with prompts and model setup)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateLLMNodes(config, targetPath) {
    const llmNodesPath = path.join(targetPath, 'src/nodes/llm');
    await fs.ensureDir(llmNodesPath);
    
    // Extract LLM node names
    const llmNodes = new Set();
    if (Array.isArray(config.llm_nodes)) {
      config.llm_nodes.forEach(node => {
        if (node.node_name) {
          llmNodes.add(node.node_name);
        }
      });
    }
    
    // If no LLM nodes specified, use agent stages or create minimal default
    if (llmNodes.size === 0) {
      if (Array.isArray(config.agent && config.agent.stages) && config.agent.stages.length > 0) {
        // Use the agent stages as LLM nodes
        config.agent.stages.forEach(stage => llmNodes.add(stage));
      } else {
        // Minimal fallback - just one generic node
        llmNodes.add('process');
      }
    }
    
    // Generate LLM node files
    for (const nodeName of llmNodes) {
      await this.generateLLMNodeFiles(config, targetPath, nodeName);
    }
  }

  /**
   * Generate files for a specific node (LEGACY - NOT USED)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} stage - Stage name
   */
  static async generateNodeFiles_LEGACY_NOT_USED(config, targetPath, stage) {
    const nodePath = path.join(targetPath, 'src/nodes', stage);
    
    // Generate README.md
    await this.generateNodeReadme(config, stage, nodePath);
    
    // Generate logic.py
    const logicContent = `"""
${stage.charAt(0).toUpperCase() + stage.slice(1)} node logic
"""

import asyncio
from typing import Any, Dict
from handit_ai import tracing
from .prompts import get_prompts

class NodeExecutionError(Exception):
    """Custom exception for node execution errors"""
    pass

class NodeTimeoutError(Exception):
    """Custom exception for node timeout errors"""
    pass

class ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic:
    def __init__(self, config: Any) -> None:
        self.config = config
        self.prompts = get_prompts()
        self.stage = "${stage}"
    
    async def execute(self, input_data: Any) -> Any:
        """
        Main execution logic for the ${stage} node with comprehensive error recovery.
        
        Args:
            input_data: Input data from previous stage or initial input
            
        Returns:
            Processed data for next stage
            
        Raises:
            NodeExecutionError: If all recovery attempts fail
        """
        max_retries = 3
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Validate input before processing
                if not self.validate_input(input_data):
                    raise ValueError(f"Invalid input data for {self.stage} node")
                
                # Process with timeout
                result = await self.process_input_with_timeout(input_data)
                
                # Validate output
                if not self.validate_output(result):
                    raise ValueError(f"Invalid output from {self.stage} node")
                
                return result
                
            except (ValueError, TypeError) as e:
                # Input/output validation errors - don't retry
                print(f"❌ Validation error in {self.stage} node: {e}")
                raise NodeExecutionError(f"Validation failed in {self.stage} node: {e}")
                
            except TimeoutError as e:
                print(f"⏰ Timeout in {self.stage} node (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    raise NodeExecutionError(f"Timeout in {self.stage} node after {max_retries} attempts")
                await asyncio.sleep(retry_delay * (attempt + 1))
                
            except Exception as e:
                print(f"⚠️ Error in {self.stage} node (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt == max_retries - 1:
                    # Last attempt failed
                    error_msg = f"Failed to execute {self.stage} node after {max_retries} attempts: {e}"
                    print(f"❌ {error_msg}")
                    raise NodeExecutionError(error_msg)
                
                # Wait before retry with exponential backoff
                await asyncio.sleep(retry_delay * (2 ** attempt))
        
        # This should never be reached, but just in case
        raise NodeExecutionError(f"Unexpected error in {self.stage} node execution")
    
    async def process_input(self, data: Any) -> Any:
        """
        Process the input data for this stage.
        
        Customize this method with your specific ${stage} logic.
        """
        # TODO: Implement your processing logic
        # Example implementation:
        
        # Get the appropriate prompt
        prompt = self.prompts.get("system", "Default prompt")
        
        # Process the data (customize this)
        if isinstance(data, str):
            # Handle string input
            result = f"Processed by {self.stage}: {data}"
        elif isinstance(data, dict):
            # Handle dictionary input
            result = {**data, f"{self.stage}_processed": True}
        else:
            # Handle other types
            result = {"processed_by": self.stage, "data": data}
        
        return result
    
    async def process_input_with_timeout(self, data: Any, timeout: float = 30.0) -> Any:
        """
        Process input data with timeout protection.
        
        Args:
            data: Input data to process
            timeout: Timeout in seconds
            
        Returns:
            Processed result
            
        Raises:
            TimeoutError: If processing takes too long
        """
        try:
            return await asyncio.wait_for(
                self.process_input(data), 
                timeout=timeout
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"Processing timeout after {timeout} seconds")
    
    def validate_input(self, data: Any) -> bool:
        """
        Validate input data for this stage with comprehensive checks.
        
        Args:
            data: Input data to validate
            
        Returns:
            True if input is valid, False otherwise
        """
        if data is None:
            return False
        
        # Add type-specific validation
        if isinstance(data, str):
            # String validation
            if len(data.strip()) == 0:
                return False
            if len(data) > 10000:  # Prevent extremely long inputs
                return False
        elif isinstance(data, dict):
            # Dictionary validation
            if not data:
                return False
            # Check for required fields if needed
        elif isinstance(data, list):
            # List validation
            if len(data) == 0:
                return False
            if len(data) > 1000:  # Prevent extremely large lists
                return False
        
        return True
    
    def validate_output(self, data: Any) -> bool:
        """
        Validate output data from this stage.
        
        Args:
            data: Output data to validate
            
        Returns:
            True if output is valid, False otherwise
        """
        if data is None:
            return False
        
        # Add output-specific validation
        if isinstance(data, str):
            return len(data.strip()) > 0
        elif isinstance(data, dict):
            return bool(data)
        elif isinstance(data, list):
            return len(data) > 0
        
        return True
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this node.
        
        Returns:
            Dictionary containing node metadata
        """
        return {
            "stage": self.stage,
            "config": self.config.get_model_config()
        }
`;

    await fs.writeFile(path.join(nodePath, 'processor.py'), logicContent);

    // Generate prompts.py
    const promptsContent = `"""
Prompt definitions for the ${stage} node
"""

from typing import Dict, List, Any

def get_prompts() -> Dict[str, Any]:
    """
    Define prompts for the ${stage} node.
    
    Customize these prompts for your specific use case.
    
    Returns:
        Dictionary containing prompt templates and examples
    """
    return {
        "system": f"""You are a helpful AI assistant specialized in ${stage} tasks.

Your role is to:
- Process input data for the ${stage} stage
- Apply appropriate ${stage} logic
- Return structured results for the next stage

Guidelines:
- Be precise and focused on ${stage} functionality
- Maintain consistency with the overall agent workflow
- Handle errors gracefully
- Provide clear, actionable outputs""",

        "user_template": """Process the following input for the ${stage} stage:

Input: {input}

Context: {context}

Please provide a structured response that can be used by the next stage in the pipeline.""",

        "examples": [
            {
                "input": "Sample input for ${stage}",
                "output": "Sample output from ${stage}",
                "context": "Example context"
            }
        ],
        
        "error_handling": {
            "invalid_input": "The input provided is not valid for ${stage} processing.",
            "processing_error": "An error occurred while processing the input in ${stage}.",
            "timeout": "The ${stage} processing timed out."
        },
        
        "validation_rules": {
            "required_fields": ["input"],
            "optional_fields": ["context", "metadata"],
            "input_types": ["string", "dict", "list"]
        }
    }

def get_stage_specific_prompts(stage_type: str) -> Dict[str, Any]:
    """
    Get stage-specific prompts based on the stage type.
    
    Args:
        stage_type: Type of stage (retrieve, reason, act, etc.)
        
    Returns:
        Stage-specific prompt configuration
    """
    stage_prompts = {
        "retrieve": {
            "description": "Retrieve relevant information from available sources",
            "focus": "Information gathering and data retrieval",
            "output_format": "Structured data with retrieved information"
        },
        "reason": {
            "description": "Analyze and reason about the retrieved information",
            "focus": "Logical analysis and decision making",
            "output_format": "Analysis results and reasoning chain"
        },
        "act": {
            "description": "Execute actions based on reasoning results",
            "focus": "Action execution and result generation",
            "output_format": "Action results and final output"
        }
    }
    
    return stage_prompts.get(stage_type, {
        "description": f"Process data for {stage_type} stage",
        "focus": "Data processing and transformation",
        "output_format": "Processed data for next stage"
    })

def format_prompt(template: str, **kwargs) -> str:
    """
    Format a prompt template with provided variables.
    
    Args:
        template: Prompt template string
        **kwargs: Variables to substitute in the template
        
    Returns:
        Formatted prompt string
    """
    try:
        return template.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing required variable: {e}")
`;

    await fs.writeFile(path.join(nodePath, 'prompts.py'), promptsContent);

    // Generate __init__.py
    const initContent = `"""
${stage.charAt(0).toUpperCase() + stage.slice(1)} node package
"""

from .logic import ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic
from .prompts import get_prompts, get_stage_specific_prompts, format_prompt

__all__ = [
    "${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic",
    "get_prompts",
    "get_stage_specific_prompts", 
    "format_prompt"
]
`;

    await fs.writeFile(path.join(nodePath, '__init__.py'), initContent);
  }

  /**
   * Generate files for a tool node (no prompts)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} nodeName - Node name
   */
  static async generateToolNodeFiles(config, targetPath, nodeName) {
    const nodePath = path.join(targetPath, 'src/nodes/tools', nodeName);
    await fs.ensureDir(nodePath);
    
    // Generate README.md
    await this.generateToolNodeReadme(config, nodeName, nodePath);
    
    // Generate processor.py (tool-specific)
    const logicContent = `"""
${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} tool node
"""

import asyncio
from typing import Any, Dict, List
from ...base import BaseToolNode

class ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}ToolNode(BaseToolNode):
    """
    ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} tool node implementation
    
    This node executes specific tool actions for the ${nodeName} functionality.
    Customize the run() method to implement your specific tool logic.
    """
    
    def __init__(self, config):
        super().__init__(config, "${nodeName}")
    
    async def run(self, input_data: Any) -> Any:
        """
        Main execution logic for the ${nodeName} tool node with error recovery.
        
        Args:
            input_data: Input data from previous stage or initial input
            
        Returns:
            Processed data for next stage
            
        Raises:
            NodeExecutionError: If all recovery attempts fail
        """
        max_retries = 3
        retry_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Validate input
                if not self.validate_input(input_data):
                    raise ValueError(f"Invalid input data for {self.node_name}")
                
                # Execute tool logic (no timeout for tools)
                result = await self._execute_${nodeName.replace('-', '_').replace(' ', '_')}_logic(input_data)
                
                # Validate output
                if not self.validate_output(result):
                    raise ValueError(f"Invalid output from {self.node_name}")
                
                return result
                
            except (ValueError, TypeError) as e:
                # Validation errors - don't retry
                print(f"❌ Validation error in {self.node_name}: {e}")
                raise NodeExecutionError(f"Validation failed in {self.node_name}: {e}")
                
            except Exception as e:
                print(f"⚠️ Error in {self.node_name} (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt == max_retries - 1:
                    error_msg = f"Failed to execute {self.node_name} after {max_retries} attempts: {e}"
                    print(f"❌ {error_msg}")
                    raise NodeExecutionError(error_msg)
                
                # Exponential backoff
                await asyncio.sleep(retry_delay * (2 ** attempt))
        
        raise NodeExecutionError(f"Unexpected error in {self.node_name} execution")
    
    async def _execute_${nodeName.replace('-', '_').replace(' ', '_')}_logic(self, data: Any) -> Any:
        """
        Execute the specific ${nodeName} tool logic
        
        Customize this method with your specific tool implementation:
        - HTTP requests for API calls
        - File operations for data processing  
        - Web scraping for information gathering
        - Calculator operations for computations
        - Database queries for data retrieval
        
        Available tools: {self.available_tools}
        """
        # TODO: Replace this placeholder with your actual tool logic
        
        # Example implementations based on common tool types:
        
        if "http_fetch" in self.available_tools:
            # Example: HTTP request tool
            # result = await self.execute_tool("http_fetch", {
            #     "url": "https://api.example.com/data",
            #     "method": "GET",
            #     "headers": {"Content-Type": "application/json"}
            # })
            pass
        
        if "web_search" in self.available_tools:
            # Example: Web search tool
            # result = await self.execute_tool("web_search", {
            #     "query": str(data),
            #     "num_results": 5
            # })
            pass
        
        if "calculator" in self.available_tools:
            # Example: Calculator tool
            # result = await self.execute_tool("calculator", {
            #     "expression": str(data)
            # })
            pass
        
        if "file_io" in self.available_tools:
            # Example: File operations tool
            # result = await self.execute_tool("file_io", {
            #     "operation": "read",
            #     "path": "/path/to/file"
            # })
            pass
        
        # Placeholder response - replace with actual implementation
        return {
            "node": self.node_name,
            "processed_data": data,
            "tools_available": self.available_tools,
            "message": f"${nodeName} tool executed successfully"
        }
`;

    await fs.writeFile(path.join(nodePath, 'processor.py'), logicContent);

    // Generate __init__.py
    const initContent = `"""
${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} tool node package
"""

from .processor import ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}ToolNode

__all__ = [
    "${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}ToolNode"
]
`;

    await fs.writeFile(path.join(nodePath, '__init__.py'), initContent);
  }

  /**
   * Generate files for an LLM node (with prompts and model setup)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} nodeName - Node name
   */
  static async generateLLMNodeFiles(config, targetPath, nodeName) {
    const nodePath = path.join(targetPath, 'src/nodes/llm', nodeName);
    await fs.ensureDir(nodePath);
    
    // Generate README.md
    await this.generateLLMNodeReadme(config, nodeName, nodePath);
    
    // Generate processor.py (LLM-specific with model setup)
    const logicContent = `"""
${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} LLM node
"""

import asyncio
from typing import Any, Dict
from ...base import BaseLLMNode
from .prompts import get_prompts

class ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}LLMNode(BaseLLMNode):
    """
    ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} LLM node implementation
    
    This node processes input using LLM capabilities for the ${nodeName} functionality.
    Customize the run() method to implement your specific LLM logic and AI system calls.
    """
    
    def __init__(self, config):
        super().__init__(config, "${nodeName}")
        # Load node-specific prompts
        self.node_prompts = get_prompts()
    
    async def run(self, input_data: Any) -> Any:
        """
        Execute the ${nodeName} LLM logic with comprehensive error recovery.
        
        Args:
            input_data: Input data to process with LLM
            
        Returns:
            LLM-processed result
            
        Raises:
            NodeExecutionError: If all recovery attempts fail
        """
        max_retries = 3
        retry_delay = 2.0  # Longer delay for LLM calls
        
        for attempt in range(max_retries):
            try:
                # Validate input
                if not self.validate_input(input_data):
                    raise ValueError(f"Invalid input data for {self.node_name}")
                
                # Execute with timeout (longer for LLM calls)
                result = await asyncio.wait_for(
                    self._execute_${nodeName.replace('-', '_').replace(' ', '_')}_llm_logic(input_data),
                    timeout=60.0
                )
                
                # Validate output
                if not self.validate_output(result):
                    raise ValueError(f"Invalid output from {self.node_name}")
                
                return result
                
            except (ValueError, TypeError) as e:
                # Validation errors - don't retry
                print(f"❌ Validation error in {self.node_name}: {e}")
                raise NodeExecutionError(f"Validation failed in {self.node_name}: {e}")
                
            except asyncio.TimeoutError:
                print(f"⏰ LLM timeout in {self.node_name} (attempt {attempt + 1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise NodeExecutionError(f"LLM timeout in {self.node_name} after {max_retries} attempts")
                await asyncio.sleep(retry_delay * (attempt + 1))
                
            except Exception as e:
                print(f"⚠️ LLM error in {self.node_name} (attempt {attempt + 1}/{max_retries}): {e}")
                
                if attempt == max_retries - 1:
                    error_msg = f"Failed to execute {self.node_name} after {max_retries} attempts: {e}"
                    print(f"❌ {error_msg}")
                    raise NodeExecutionError(error_msg)
                
                # Exponential backoff with longer delays for LLM
                await asyncio.sleep(retry_delay * (2 ** attempt))
        
        raise NodeExecutionError(f"Unexpected error in {self.node_name} execution")
    
    async def _execute_${nodeName.replace('-', '_').replace(' ', '_')}_llm_logic(self, data: Any) -> Any:
        """
        Execute the specific ${nodeName} LLM logic
        
        This method should call your AI system with the appropriate prompts.
        Customize this method to implement your specific LLM integration:
        
        - OpenAI API calls
        - Ollama local model calls  
        - Anthropic Claude API calls
        - Custom model endpoints
        - Prompt engineering and response processing
        
        Available prompts: {list(self.node_prompts.keys())}
        Model configuration: {self.model_config}
        """
        # TODO: Replace this placeholder with your actual LLM integration
        
        # Get the appropriate prompt for this node
        system_prompt = self.node_prompts.get("system", "You are a helpful AI assistant.")
        user_prompt = self.node_prompts.get("user", "Process the following input: {input}")
        
        # Example LLM integration patterns:
        
        # 1. OpenAI API Example:
        # if self.model_config.get("provider") == "openai":
        #     import openai
        #     response = await openai.ChatCompletion.acreate(
        #         model=self.model_config.get("name", "gpt-3.5-turbo"),
        #         messages=[
        #             {"role": "system", "content": system_prompt},
        #             {"role": "user", "content": user_prompt.format(input=str(data))}
        #         ]
        #     )
        #     return response.choices[0].message.content
        
        # 2. Ollama Example:
        # if self.model_config.get("provider") == "ollama":
        #     import ollama
        #     response = await ollama.chat(
        #         model=self.model_config.get("name", "llama2"),
        #         messages=[
        #             {"role": "system", "content": system_prompt},
        #             {"role": "user", "content": user_prompt.format(input=str(data))}
        #         ]
        #     )
        #     return response['message']['content']
        
        # 3. Custom API Example:
        # result = await self.call_llm(
        #     prompt=f"{system_prompt}\\n\\n{user_prompt.format(input=str(data))}",
        #     input_data=data
        # )
        
        # Placeholder response - replace with actual LLM integration
        formatted_prompt = user_prompt.format(input=str(data))
        
        return {
            "node": self.node_name,
            "llm_response": f"LLM response for {self.node_name}: processed '{data}'",
            "model_used": f"{self.model_config.get('provider', 'unknown')}/{self.model_config.get('name', 'unknown')}",
            "prompt_used": system_prompt[:50] + "...",
            "input_processed": data
        }
`;

    await fs.writeFile(path.join(nodePath, 'processor.py'), logicContent);

    // Generate prompts.py (only for LLM nodes)
    const promptsContent = `"""
Prompt definitions for the ${nodeName} LLM node
"""

from typing import Dict, List, Any

def get_prompts() -> Dict[str, Any]:
    """
    Define prompts for the ${nodeName} LLM node.
    
    Customize these prompts for your specific use case.
    
    Returns:
        Dictionary containing prompt templates and examples
    """
    return {
        "system": f"""You are a helpful AI assistant specialized in ${nodeName} tasks.

Your role is to:
- Process input data for the ${nodeName} stage
- Apply appropriate ${nodeName} logic using LLM capabilities
- Return structured results for the next stage

Guidelines:
- Be precise and focused on ${nodeName} functionality
- Maintain consistency with the overall agent workflow
- Handle errors gracefully
- Provide clear, actionable outputs""",

        "user_template": """Process the following input for the ${nodeName} LLM stage:

Input: {input}

Context: {context}

Please provide a structured response that can be used by the next stage in the pipeline.""",

        "examples": [
            {
                "input": f"Sample input for ${nodeName}",
                "output": f"Sample LLM output from ${nodeName}",
                "context": "Example context"
            }
        ],
        
        "error_handling": {
            "invalid_input": f"The input provided is not valid for ${nodeName} LLM processing.",
            "processing_error": f"An error occurred while processing the input in ${nodeName} LLM.",
            "timeout": f"The ${nodeName} LLM processing timed out."
        },
        
        "validation_rules": {
            "required_fields": ["input"],
            "optional_fields": ["context", "metadata"],
            "input_types": ["string", "dict", "list"]
        }
    }

def get_node_specific_prompts(node_type: str) -> Dict[str, Any]:
    """
    Get node-specific prompts based on the node type.
    
    Args:
        node_type: Type of LLM node
        
    Returns:
        Node-specific prompt configuration
    """
    # Node-specific prompts - customize these for each specific node
    node_prompts = {
        "${nodeName}": {
            "description": "Customize this description for the ${nodeName} node functionality",
            "focus": "Define the specific focus and purpose of the ${nodeName} node",
            "output_format": "Specify the expected output format for this node"
        }
    }
    
    return node_prompts.get(node_type, {
        "description": f"Process data using LLM capabilities for {node_type}",
        "focus": "LLM-powered data processing and transformation",
        "output_format": "Processed data for next stage"
    })

def format_prompt(template: str, **kwargs) -> str:
    """
    Format a prompt template with provided variables.
    
    Args:
        template: Prompt template string
        **kwargs: Variables to substitute in the template
        
    Returns:
        Formatted prompt string
    """
    try:
        return template.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing required variable: {e}")
`;

    await fs.writeFile(path.join(nodePath, 'prompts.py'), promptsContent);

    // Generate __init__.py
    const initContent = `"""
${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} LLM node package
"""

from .processor import ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}LLMNode
from .prompts import get_prompts, get_node_specific_prompts, format_prompt

__all__ = [
    "${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)}LLMNode",
    "get_prompts",
    "get_node_specific_prompts", 
    "format_prompt"
]
`;

    await fs.writeFile(path.join(nodePath, '__init__.py'), initContent);
  }

  /**
   * Generate README.md for a specific node
   * @param {Object} config - Configuration object
   * @param {string} stage - Stage name
   * @param {string} nodePath - Node directory path
   */
  static async generateNodeReadme(config, stage, nodePath) {
    const stageCapitalized = stage.charAt(0).toUpperCase() + stage.slice(1);
    const readmeContent = `# ${stageCapitalized} Node

This folder contains the implementation for the **${stage}** stage of the ${config.project.name} agent.

## Files

- **\`logic.py\`** - Contains the main execution logic for this node
- **\`prompts.py\`** - Contains prompt definitions and templates
- **\`__init__.py\`** - Makes this directory a Python package

## Purpose

The ${stage} node is responsible for:

${this.getNodeDescription(stage)}

## Usage

\`\`\`python
from src.nodes.${stage}.logic import ${stageCapitalized}Logic

# Initialize the node
node = ${stageCapitalized}Logic(config)

# Execute the node
result = await node.execute(input_data)
\`\`\`

## Configuration

This node uses the following configuration:
- **Model**: ${(config.model && config.model.provider && config.model.name) ? `${config.model.provider}/${config.model.name}` : 'Multiple models per node'}
- **Tools**: ${Array.isArray(config.tools) ? 'Node-specific tools' : (config.tools && config.tools.selected ? config.tools.selected.join(', ') : 'No tools specified')}
- **Storage**: ${(config.storage && config.storage.memory) || 'memory'}/${(config.storage && config.storage.cache) || 'cache'}/${(config.storage && config.storage.sql) || 'sqlite'}

## Customization

To customize this node:

1. **Modify Logic**: Edit \`logic.py\` to change the execution behavior
2. **Update Prompts**: Edit \`prompts.py\` to modify prompt templates
3. **Add Tools**: Extend the tools configuration in the main config
4. **Change Model**: Update the model configuration for this specific node

## Handit Integration

This node is automatically traced by Handit.ai for monitoring and observability.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Get description for a specific node stage
   * @param {string} stage - Stage name
   * @returns {string} Description of the stage
   */
  static getNodeDescription(stage) {
    const descriptions = {
      'retrieve': '- Retrieving relevant information from data sources\n- Searching knowledge bases and databases\n- Gathering context for the reasoning stage',
      'reason': '- Analyzing retrieved information\n- Making logical inferences and connections\n- Determining the best course of action\n- Processing complex reasoning tasks',
      'act': '- Executing actions based on reasoning\n- Generating responses or outputs\n- Performing final processing steps\n- Delivering results to the user',
      'process': '- Processing input data\n- Transforming and analyzing information\n- Preparing data for further stages\n- Handling data validation and cleaning'
    };
    
    return descriptions[stage] || '- Processing data and executing logic\n- Implementing the core functionality\n- Handling input/output operations';
  }

  /**
   * Generate README.md for a tool node
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @param {string} nodePath - Node directory path
   */
  static async generateToolNodeReadme(config, nodeName, nodePath) {
    const nodeCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    const readmeContent = `# ${nodeCapitalized} Tool Node

This folder contains the implementation for the **${nodeName}** tool node of the ${config.project.name} agent.

## Files

- **\`processor.py\`** - Contains the main processing logic for this tool node
- **\`__init__.py\`** - Makes this directory a Python package

## Purpose

The ${nodeName} tool node is responsible for:
- Executing tool-based operations
- Processing data using available tools
- Providing tool-specific functionality

## Available Tools

This node has access to the following tools:
${this.getNodeToolsList(config, nodeName)}

## Usage

\`\`\`python
from src.nodes.tools.${nodeName}.processor import ${nodeCapitalized}ToolNode

# Initialize the tool node
node = ${nodeCapitalized}ToolNode(config)

# Run the tool node
result = await node.run(input_data)

# Get available tools
tools = node.get_available_tools()
\`\`\`

## Configuration

This tool node uses the following configuration:
- **Type**: Tool Node
- **Available Tools**: Node-specific tools
- **Storage**: ${(config.storage && config.storage.memory) || 'memory'}/${(config.storage && config.storage.cache) || 'cache'}/${(config.storage && config.storage.sql) || 'sqlite'}

## Customization

To customize this tool node:

1. **Modify Processor**: Edit \`processor.py\` to change the tool processing behavior
2. **Add Tools**: Update the tools configuration for this specific node
3. **Tool Integration**: Implement specific tool integrations in the logic

## Note

Tool nodes do not have prompts - they focus on tool execution and data processing.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Generate README.md for an LLM node
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @param {string} nodePath - Node directory path
   */
  static async generateLLMNodeReadme(config, nodeName, nodePath) {
    const nodeCapitalized = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
    const readmeContent = `# ${nodeCapitalized} LLM Node

This folder contains the implementation for the **${nodeName}** LLM node of the ${config.project.name} agent.

## Files

- **\`processor.py\`** - Contains the main processing logic for this LLM node
- **\`prompts.py\`** - Contains prompt definitions and templates
- **\`__init__.py\`** - Makes this directory a Python package

## Purpose

The ${nodeName} LLM node is responsible for:
- Processing data using Large Language Model capabilities
- Applying prompts and generating intelligent responses
- Providing AI-powered reasoning and analysis

## Model Configuration

This LLM node uses:
${this.getNodeModelInfo(config, nodeName)}

## Usage

\`\`\`python
from src.nodes.llm.${nodeName}.processor import ${nodeCapitalized}LLMNode

# Initialize the LLM node
node = ${nodeCapitalized}LLMNode(config)

# Run the LLM node
result = await node.run(input_data)

# Get model information
model_info = node.get_model_info()
\`\`\`

## Configuration

This LLM node uses the following configuration:
- **Type**: LLM Node
- **Model**: Node-specific model configuration
- **Prompts**: Custom prompt templates
- **Storage**: ${(config.storage && config.storage.memory) || 'memory'}/${(config.storage && config.storage.cache) || 'cache'}/${(config.storage && config.storage.sql) || 'sqlite'}

## Customization

To customize this LLM node:

1. **Modify Processor**: Edit \`processor.py\` to change the LLM processing behavior
2. **Update Prompts**: Edit \`prompts.py\` to modify prompt templates
3. **Change Model**: Update the model configuration for this specific node
4. **Add Context**: Enhance prompts with additional context

## Handit Integration

This LLM node is automatically traced by Handit.ai for monitoring and observability.
`;

    await fs.writeFile(path.join(nodePath, 'README.md'), readmeContent);
  }

  /**
   * Get tools list for a specific node
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @returns {string} Formatted tools list
   */
  static getNodeToolsList(config, nodeName) {
    if (Array.isArray(config.tools)) {
      for (const toolNode of config.tools) {
        if (toolNode.node_name === nodeName && toolNode.selected) {
          return toolNode.selected.map(tool => `- ${tool}`).join('\n');
        }
      }
    }
    return '- No tools specified';
  }

  /**
   * Get model info for a specific node
   * @param {Object} config - Configuration object
   * @param {string} nodeName - Node name
   * @returns {string} Formatted model info
   */
  static getNodeModelInfo(config, nodeName) {
    if (Array.isArray(config.llm_nodes)) {
      for (const llmNode of config.llm_nodes) {
        if (llmNode.node_name === nodeName && llmNode.model) {
          return `- **Provider**: ${llmNode.model.provider}\n- **Model**: ${llmNode.model.name}`;
        }
      }
    }
    return `- **Provider**: ${config.project.default_llm_provider || 'mock'}\n- **Model**: Default model`;
  }

  /**
   * Generate requirements.txt
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateRequirements(config, targetPath) {
    const requirements = [
      '# Core dependencies',
      'handit_ai>=1.0.0',
      'python-dotenv>=1.0.0',
      'asyncio',
      '',
      '# Data handling',
      'pydantic>=2.0.0',
      'typing-extensions',
      '',
      '# Logging and monitoring',
      'structlog>=23.0.0',
      '',
      '# Testing',
      'pytest>=7.0.0',
      'pytest-asyncio>=0.21.0',
      '',
      '# Development',
      'black>=23.0.0',
      'flake8>=6.0.0',
      'mypy>=1.0.0'
    ];

    // Add runtime-specific dependencies
    if (config.runtime.type === 'fastapi') {
      requirements.push(
        '',
        '# FastAPI runtime',
        'fastapi>=0.100.0',
        'uvicorn[standard]>=0.23.0',
        'pydantic-settings>=2.0.0'
      );
    }

    // Add storage-specific dependencies
    if (config.storage.memory === 'faiss-local') {
      requirements.push(
        '',
        '# Vector storage',
        'faiss-cpu>=1.7.0',
        'numpy>=1.24.0'
      );
    }

    if (config.storage.sql === 'sqlite') {
      requirements.push(
        '',
        '# SQL storage',
        'sqlalchemy>=2.0.0',
        'alembic>=1.11.0'
      );
    }

    if (config.storage.cache === 'redis') {
      requirements.push(
        '',
        '# Cache storage',
        'redis>=4.6.0',
        'aioredis>=2.0.0'
      );
    }

    await fs.writeFile(path.join(targetPath, 'requirements.txt'), requirements.join('\n'));
  }

  /**
   * Generate utility files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateUtils(config, targetPath) {
    const utilsPath = path.join(targetPath, 'src/utils');
    await fs.ensureDir(utilsPath);

    // Generate logger.py
    const loggerContent = `"""
Logging configuration for ${config.project.name}
"""

import logging
import sys
from typing import Optional

def setup_logging(level: str = "INFO", log_file: Optional[str] = None) -> logging.Logger:
    """
    Set up logging configuration.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger("${config.project.name}")
    logger.setLevel(getattr(logging, level.upper()))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)
`;

    await fs.writeFile(path.join(utilsPath, 'logger.py'), loggerContent);

    // Generate __init__.py for utils
    const utilsInitContent = `"""
Utility functions for ${config.project.name}
"""

from .logger import setup_logging, get_logger

__all__ = ["setup_logging", "get_logger"]
`;

    await fs.writeFile(path.join(utilsPath, '__init__.py'), utilsInitContent);
  }
}

module.exports = BasePythonGenerator;
