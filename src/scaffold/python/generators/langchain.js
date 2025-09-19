const fs = require('fs-extra');
const path = require('path');
const BasePythonGenerator = require('./base');

/**
 * LangChain Python generator for creating LangChain-based agent projects
 */
class LangChainPythonGenerator extends BasePythonGenerator {
  /**
   * Generate a LangChain Python project
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generate(config, targetPath) {
    console.log('🔗 Generating LangChain Python project...');

    // Generate base structure first
    await super.generate(config, targetPath);

    // Generate LangChain-specific files
    await this.generateLangChainFiles(config, targetPath);

    // Update requirements with LangChain dependencies
    await this.updateRequirements(config, targetPath);

    console.log('✅ LangChain Python project generated');
  }

  /**
   * Generate LangChain-specific files
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateLangChainFiles(config, targetPath) {
    // Generate chains directory
    const chainsPath = path.join(targetPath, 'src/chains');
    await fs.ensureDir(chainsPath);

    // Generate main chain file
    await this.generateMainChain(config, targetPath);

    // Generate tools
    await this.generateTools(config, targetPath);

    // Generate memory
    await this.generateMemory(config, targetPath);

    // Update main.py for LangChain
    await this.updateMainFile(config, targetPath);
  }

  /**
   * Generate main chain file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMainChain(config, targetPath) {
    const chainContent = `"""
Main LangChain chain for ${config.project.name}
"""

from typing import Dict, Any, List
from langchain.chains import LLMChain, SequentialChain
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser
from handit_ai import tracing

from ..config import Config
from ..tools import get_tools
from ..memory import get_memory

@tracing(agent="${config.project.name}_chain")
class ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain:
    def __init__(self, config: Config):
        self.config = config
        self.tools = get_tools(config)
        self.memory = get_memory(config)
        self.chains = self._build_chains()
    
    def _build_chains(self) -> Dict[str, LLMChain]:
        """
        Build LangChain chains for each stage.
        
        Returns:
            Dictionary of chains for each stage
        """
        chains = {}
        
        for stage in self.config.agent_stages:
            chains[stage] = self._build_stage_chain(stage)
        
        return chains
    
    def _build_stage_chain(self, stage: str) -> LLMChain:
        """
        Build a chain for a specific stage.
        
        Args:
            stage: Stage name (retrieve, reason, act, etc.)
            
        Returns:
            Configured LLMChain for the stage
        """
        # Get stage-specific prompt
        prompt_template = self._get_stage_prompt(stage)
        
        # Create prompt template
        prompt = PromptTemplate(
            input_variables=["input", "context", "memory"],
            template=prompt_template
        )
        
        # Create chain (you'll need to implement get_llm method)
        chain = LLMChain(
            llm=self._get_llm(),
            prompt=prompt,
            memory=self.memory,
            verbose=True
        )
        
        return chain
    
    def _get_stage_prompt(self, stage: str) -> str:
        """
        Get prompt template for a specific stage.
        
        Args:
            stage: Stage name
            
        Returns:
            Prompt template string
        """
        stage_prompts = {
            "retrieve": """You are a retrieval specialist. Your task is to gather relevant information.

Input: {input}
Context: {context}
Memory: {memory}

Please retrieve and organize relevant information for the next stage.""",

            "reason": """You are a reasoning specialist. Your task is to analyze and reason about the information.

Input: {input}
Context: {context}
Memory: {memory}

Please analyze the information and provide reasoning for the next stage.""",

            "act": """You are an action specialist. Your task is to execute actions based on reasoning.

Input: {input}
Context: {context}
Memory: {memory}

Please execute the appropriate actions and provide results."""
        }
        
        return stage_prompts.get(stage, """Process the input for the {stage} stage.

Input: {input}
Context: {context}
Memory: {memory}

Please process this information appropriately.""")
    
    def _get_llm(self):
        """
        Get the configured LLM instance.
        
        Returns:
            Configured LLM instance
        """
        # TODO: Implement LLM configuration based on config.model
        # This is a placeholder - you'll need to implement based on your model provider
        
        if self.config.model.provider == "mock":
            from langchain.llms.fake import FakeListLLM
            return FakeListLLM(responses=["Mock response"])
        
        elif self.config.model.provider == "ollama":
            from langchain.llms import Ollama
            return Ollama(model=self.config.model.name)
        
        else:
            raise ValueError(f"Unsupported model provider: {self.config.model.provider}")
    
    async def execute_stage(self, stage: str, input_data: Any) -> Any:
        """
        Execute a specific stage of the chain.
        
        Args:
            stage: Stage name
            input_data: Input data
            
        Returns:
            Stage output
        """
        if stage not in self.chains:
            raise ValueError(f"Unknown stage: {stage}")
        
        # Prepare input for the chain
        chain_input = {
            "input": str(input_data),
            "context": self._get_context(),
            "memory": self._get_memory_context()
        }
        
        # Execute the chain
        result = await self.chains[stage].arun(**chain_input)
        
        return result
    
    def _get_context(self) -> str:
        """
        Get current context for the chain.
        
        Returns:
            Context string
        """
        return f"Agent: {self.config.project_name}, Framework: {self.config.framework}"
    
    def _get_memory_context(self) -> str:
        """
        Get memory context for the chain.
        
        Returns:
            Memory context string
        """
        if self.memory:
            return str(self.memory.load_memory_variables({}))
        return "No memory available"
    
    async def run_pipeline(self, input_data: Any) -> Any:
        """
        Run the complete pipeline through all stages.
        
        Args:
            input_data: Initial input data
            
        Returns:
            Final pipeline result
        """
        result = input_data
        
        for stage in self.config.agent_stages:
            result = await self.execute_stage(stage, result)
        
        return result

def create_chain(config: Config) -> ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain:
    """
    Create and return a configured chain instance.
    
    Args:
        config: Configuration object
        
    Returns:
        Configured chain instance
    """
    return ${config.project.name.replace(/\s+/g, '')}Chain(config)
`;

    await fs.writeFile(path.join(targetPath, 'src/chains/main.py'), chainContent);

    // Generate __init__.py for chains
    const chainsInitContent = `"""
LangChain chains for ${config.project.name}
"""

from .main import ${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain, create_chain

__all__ = ["${config.project.name.replace(/\s+/g, '').replace(/-/g, '')}Chain", "create_chain"]
`;

    await fs.writeFile(path.join(chainsPath, '__init__.py'), chainsInitContent);
  }

  /**
   * Generate tools for LangChain
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateTools(config, targetPath) {
    const toolsPath = path.join(targetPath, 'src/tools');
    await fs.ensureDir(toolsPath);

    const toolsContent = `"""
LangChain tools for ${config.project.name}
"""

from typing import List, Dict, Any
from langchain.tools import BaseTool
from langchain.agents import Tool
from handit_ai import tracing

class CustomTool(BaseTool):
    """Base class for custom tools with Handit tracing"""
    
    def __init__(self, name: str, description: str, agent_name: str = "${config.project.name}"):
        super().__init__()
        self.name = name
        self.description = description
        self.agent_name = agent_name
    
    def _run(self, query: str) -> str:
        """
        Execute the tool with the given query.
        
        Args:
            query: Input query for the tool
            
        Returns:
            Tool output
        """
        # Override in subclasses
        return f"Tool {self.name} executed with query: {query}"
    
    async def _arun(self, query: str) -> str:
        """
        Async version of _run.
        
        Args:
            query: Input query for the tool
            
        Returns:
            Tool output
        """
        return self._run(query)

# Tool implementations
class HttpFetchTool(CustomTool):
    """Tool for making HTTP requests"""
    
    def __init__(self):
        super().__init__(
            name="http_fetch",
            description="Make HTTP requests to fetch data from URLs"
        )
    
    def _run(self, query: str) -> str:
        # TODO: Implement HTTP fetch logic
        return f"HTTP fetch result for: {query}"

class WebSearchTool(CustomTool):
    """Tool for web searching"""
    
    def __init__(self):
        super().__init__(
            name="web_search",
            description="Search the web for information"
        )
    
    def _run(self, query: str) -> str:
        # TODO: Implement web search logic
        return f"Web search result for: {query}"

class CalculatorTool(CustomTool):
    """Tool for mathematical calculations"""
    
    def __init__(self):
        super().__init__(
            name="calculator",
            description="Perform mathematical calculations"
        )
    
    def _run(self, query: str) -> str:
        try:
            # Simple calculator implementation
            result = eval(query)
            return str(result)
        except Exception as e:
            return f"Calculation error: {e}"

class FileIOTool(CustomTool):
    """Tool for file input/output operations"""
    
    def __init__(self):
        super().__init__(
            name="file_io",
            description="Read from and write to files"
        )
    
    def _run(self, query: str) -> str:
        # TODO: Implement file I/O logic
        return f"File I/O result for: {query}"

class CodeRunTool(CustomTool):
    """Tool for executing code"""
    
    def __init__(self):
        super().__init__(
            name="code_run",
            description="Execute code snippets"
        )
    
    def _run(self, query: str) -> str:
        # TODO: Implement code execution logic
        return f"Code execution result for: {query}"

def get_tools(config) -> List[Tool]:
    """
    Get available tools based on configuration.
    
    Args:
        config: Configuration object
        
    Returns:
        List of configured tools
    """
    tool_classes = {
        "http_fetch": HttpFetchTool,
        "web_search": WebSearchTool,
        "calculator": CalculatorTool,
        "file_io": FileIOTool,
        "code_run": CodeRunTool
    }
    
    tools = []
    
    for tool_name in config.tools_selected:
        if tool_name in tool_classes:
            tool_instance = tool_classes[tool_name]()
            tools.append(Tool(
                name=tool_instance.name,
                description=tool_instance.description,
                func=tool_instance._run
            ))
    
    return tools

def get_tool_by_name(tool_name: str) -> CustomTool:
    """
    Get a specific tool by name.
    
    Args:
        tool_name: Name of the tool
        
    Returns:
        Tool instance
    """
    tool_classes = {
        "http_fetch": HttpFetchTool,
        "web_search": WebSearchTool,
        "calculator": CalculatorTool,
        "file_io": FileIOTool,
        "code_run": CodeRunTool
    }
    
    if tool_name in tool_classes:
        return tool_classes[tool_name]()
    
    raise ValueError(f"Unknown tool: {tool_name}")
`;

    await fs.writeFile(path.join(toolsPath, 'tools.py'), toolsContent);

    // Generate __init__.py for tools
    const toolsInitContent = `"""
Tools for ${config.project.name}
"""

from .tools import (
    CustomTool,
    HttpFetchTool,
    WebSearchTool,
    CalculatorTool,
    FileIOTool,
    CodeRunTool,
    get_tools,
    get_tool_by_name
)

__all__ = [
    "CustomTool",
    "HttpFetchTool",
    "WebSearchTool", 
    "CalculatorTool",
    "FileIOTool",
    "CodeRunTool",
    "get_tools",
    "get_tool_by_name"
]
`;

    await fs.writeFile(path.join(toolsPath, '__init__.py'), toolsInitContent);
  }

  /**
   * Generate memory configuration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async generateMemory(config, targetPath) {
    const memoryPath = path.join(targetPath, 'src/memory');
    await fs.ensureDir(memoryPath);

    const memoryContent = `"""
Memory configuration for ${config.project.name}
"""

from typing import Optional, Dict, Any
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.memory.chat_memory import BaseChatMemory

def get_memory(config) -> Optional[BaseChatMemory]:
    """
    Get configured memory instance based on configuration.
    
    Args:
        config: Configuration object
        
    Returns:
        Configured memory instance or None
    """
    memory_config = config.get_storage_config()
    
    if memory_config["memory"] == "none":
        return None
    
    # For now, use simple buffer memory
    # TODO: Implement more sophisticated memory based on storage config
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True
    )
    
    return memory

def create_vector_memory(config) -> Optional[BaseChatMemory]:
    """
    Create vector-based memory if configured.
    
    Args:
        config: Configuration object
        
    Returns:
        Vector memory instance or None
    """
    memory_config = config.get_storage_config()
    
    if memory_config["memory"] != "faiss-local":
        return None
    
    # TODO: Implement FAISS-based vector memory
    # This would require additional setup for vector storage
    return None

def get_memory_context(memory: Optional[BaseChatMemory]) -> str:
    """
    Get memory context as string.
    
    Args:
        memory: Memory instance
        
    Returns:
        Memory context string
    """
    if not memory:
        return "No memory available"
    
    try:
        memory_vars = memory.load_memory_variables({})
        return str(memory_vars)
    except Exception:
        return "Memory error"
`;

    await fs.writeFile(path.join(memoryPath, 'memory.py'), memoryContent);

    // Generate __init__.py for memory
    const memoryInitContent = `"""
Memory management for ${config.project.name}
"""

from .memory import get_memory, create_vector_memory, get_memory_context

__all__ = ["get_memory", "create_vector_memory", "get_memory_context"]
`;

    await fs.writeFile(path.join(memoryPath, '__init__.py'), memoryInitContent);
  }

  /**
   * Update main.py for LangChain integration
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateMainFile(config, targetPath) {
    const mainContent = `#!/usr/bin/env python3
"""
Main application entry point for ${config.project.name} (LangChain)
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
from src.chains import create_chain

class LangChainAgent:
    def __init__(self):
        self.config = Config()
        self.chain = create_chain(self.config)
    
    async def process(self, input_data):
        """
        Process input through the LangChain pipeline
        """
        result = await self.chain.run_pipeline(input_data)
        return result

@tracing(agent="${config.project.name}")
async def main():
    """
    Main application entry point
    """
    print(f"Starting ${config.project.name} (LangChain)...")
    
    # Initialize agent
    agent = LangChainAgent()
    
    # Runtime-specific initialization
    if "${config.runtime.type}" == 'fastapi':
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
                    metadata={"agent": "${config.project.name}", "framework": "langchain"}
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {"status": "healthy", "agent": "${config.project.name}", "framework": "langchain"}
        
        # Start the server
        port = ${config.runtime.port || 8000}
        print(f"Starting FastAPI server on port {port}")
        uvicorn.run(app, host="0.0.0.0", port=port)
    
    elif "${config.runtime.type}" == 'cli':
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
        # Example: Redis queue, Celery, or other message queue
    
    else:
        # Default mode (fallback)
        print("Running in default mode")
        result = await agent.process("Hello, world!")
        print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(main())
`;

    await fs.writeFile(path.join(targetPath, 'main.py'), mainContent);
  }

  /**
   * Update requirements.txt with LangChain dependencies
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  static async updateRequirements(config, targetPath) {
    const requirementsPath = path.join(targetPath, 'requirements.txt');
    let requirements = await fs.readFile(requirementsPath, 'utf8');

    // Add LangChain dependencies
    const langchainDeps = [
      '',
      '# LangChain dependencies',
      'langchain>=0.1.0',
      'langchain-community>=0.0.10',
      'langchain-core>=0.1.0',
      '',
      '# LLM providers',
      'openai>=1.0.0',
      'ollama>=0.1.0',
      '',
      '# Additional LangChain tools',
      'requests>=2.31.0',
      'beautifulsoup4>=4.12.0',
      'duckduckgo-search>=3.9.0'
    ];

    requirements += langchainDeps.join('\n');
    await fs.writeFile(requirementsPath, requirements);
  }
}

module.exports = LangChainPythonGenerator;
