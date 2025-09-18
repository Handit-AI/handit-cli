const fs = require('fs-extra');
const path = require('path');

/**
 * Base Python generator for creating Python agent projects
 */
class BasePythonGenerator {
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
from src.nodes.retrieve.logic import RetrieveLogic
from src.nodes.reason.logic import ReasonLogic
from src.nodes.act.logic import ActLogic

class AgentPipeline:
    def __init__(self):
        self.config = Config()
        self.nodes = {
            'retrieve': RetrieveLogic(self.config),
            'reason': ReasonLogic(self.config),
            'act': ActLogic(self.config)
        }
    
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
Configuration management for ${config.project.name}
"""

import os
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class ModelConfig:
    provider: str
    name: str

@dataclass
class StorageConfig:
    memory: str
    cache: str
    sql: str

@dataclass
class AgentConfig:
    stages: List[str]
    sub_agents: int

@dataclass
class ToolsConfig:
    selected: List[str]

class Config:
    def __init__(self) -> None:
        self.project_name: str = "${config.project.name}"
        self.language: str = "${config.project.language}"
        self.framework: str = "${config.project.framework}"
        
        self.runtime_type: str = "${config.runtime.type}"
        self.runtime_port: int = ${config.runtime.port || 'None'}
        
        self.orchestration_style: str = "${config.orchestration.style}"
        
        self.agent_stages: List[str] = ${JSON.stringify(config.agent.stages)}
        self.agent_sub_agents: int = ${config.agent.subAgents}
        
        self.tools_selected: List[str] = ${JSON.stringify(config.tools.selected)}
        
        self.model: ModelConfig = ModelConfig(
            provider="${config.model ? config.model.provider : 'mock'}",
            name="${config.model ? config.model.name : 'mock-llm'}"
        )
        
        # LLM nodes configuration (new structure)
        self.llm_nodes: List[Dict[str, Any]] = ${JSON.stringify(config.llm_nodes || [])};
        
        self.storage: StorageConfig = StorageConfig(
            memory="${config.storage.memory}",
            cache="${config.storage.cache}",
            sql="${config.storage.sql}"
        )
        
        # Environment variables
        self.handit_api_key = os.getenv("HANDIT_API_KEY")
        self.model_provider = os.getenv("MODEL_PROVIDER", self.model.provider)
        self.model_name = os.getenv("MODEL_NAME", self.model.name)
        
        # Runtime configuration
        if self.runtime_type in ['fastapi']:
            self.port = int(os.getenv("PORT", self.runtime_port or 8000))
        
        # Storage configuration
        self.memory_storage = os.getenv("MEMORY_STORAGE", self.storage.memory)
        self.cache_storage = os.getenv("CACHE_STORAGE", self.storage.cache)
        self.sql_storage = os.getenv("SQL_STORAGE", self.storage.sql)
    
    def get_model_config(self) -> Dict[str, Any]:
        """Get model configuration"""
        return {
            "provider": self.model_provider,
            "name": self.model_name
        }
    
    def get_storage_config(self) -> Dict[str, Any]:
        """Get storage configuration"""
        return {
            "memory": self.memory_storage,
            "cache": self.cache_storage,
            "sql": self.sql_storage
        }
    
    def get_tools_config(self) -> Dict[str, Any]:
        """Get tools configuration"""
        return {
            "selected": self.tools_selected
        }
    
    def get_node_model_config(self, node_name: str) -> Dict[str, Any]:
        """
        Get model configuration for a specific node.
        
        Args:
            node_name: Name of the node
            
        Returns:
            Model configuration for the node
        """
        # Check if we have llm_nodes configuration
        if self.llm_nodes:
            for llm_node in self.llm_nodes:
                if llm_node.get('node_name') == node_name:
                    return llm_node.get('model', {})
        
        # Fallback to default model configuration
        return self.get_model_config()
`;

    await fs.writeFile(path.join(targetPath, 'src/config.py'), configContent);
  }

  /**
   * Generate node files for each stage
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateNodes(config, targetPath) {
    for (const stage of config.agent.stages) {
      await this.generateNodeFiles(config, targetPath, stage);
    }
  }

  /**
   * Generate files for a specific node
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   * @param {string} stage - Stage name
   */
  static async generateNodeFiles(config, targetPath, stage) {
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

class ${stage.charAt(0).toUpperCase() + stage.slice(1)}Logic:
    def __init__(self, config: Any) -> None:
        self.config = config
        self.prompts = get_prompts()
        self.stage = "${stage}"
    
    async def execute(self, input_data: Any) -> Any:
        """
        Main execution logic for the ${stage} node.
        
        Args:
            input_data: Input data from previous stage or initial input
            
        Returns:
            Processed data for next stage
        """
        try:
            # TODO: Implement your ${stage} logic here
            result = await self.process_input(input_data)
            return result
        except Exception as e:
            print(f"Error in {self.stage} node: {e}")
            raise
    
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
    
    def validate_input(self, data: Any) -> bool:
        """
        Validate input data for this stage.
        
        Returns:
            True if input is valid, False otherwise
        """
        # TODO: Implement input validation
        return data is not None
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about this node.
        
        Returns:
            Dictionary containing node metadata
        """
        return {
            "stage": self.stage,
            "config": self.config.get_model_config(),
            "tools": self.config.get_tools_config()
        }
`;

    await fs.writeFile(path.join(nodePath, 'logic.py'), logicContent);

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
- **Model**: ${config.model ? `${config.model.provider}/${config.model.name}` : 'Multiple models per node'}
- **Tools**: ${config.tools.selected.join(', ')}
- **Storage**: ${config.storage.memory}/${config.storage.cache}/${config.storage.sql}

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
