# Python Agent Scaffolding

This directory contains Python-specific scaffolding templates and generators for creating AI agents with Handit.ai integration.

## Structure

```
python/
├── templates/           # Template files for different runtimes
│   ├── fastapi/        # FastAPI web service templates
│   ├── cli/            # Command-line interface templates
│   ├── worker/         # Background worker templates
│   └── base/           # Base Python project templates
├── generators/          # Code generation logic
│   ├── base.js         # Base Python generator
│   ├── langchain.js    # LangChain-specific generator
│   └── langgraph.js    # LangGraph-specific generator
└── README.md           # This file
```

## Supported Runtimes

### FastAPI
- **Use case**: Web APIs, REST endpoints
- **Features**: Async support, automatic OpenAPI docs, middleware
- **Port**: Default 8000
- **Example**: Chat API, document processing service

### CLI
- **Use case**: Command-line tools, batch processing
- **Features**: Argument parsing, progress bars, file I/O
- **Example**: Data processing scripts, automation tools

### Worker
- **Use case**: Background processing, queue workers
- **Features**: Queue integration, retry logic, monitoring
- **Example**: Email processing, image generation

## Supported Frameworks

### Base
- **Description**: Pure Python implementation without external frameworks
- **Best for**: Simple agents, custom implementations
- **Features**: Basic async/await, error handling, logging

### LangChain
- **Description**: LangChain framework integration
- **Best for**: Complex chains, tool integration, memory
- **Features**: Chain composition, tool calling, memory management

### LangGraph
- **Description**: LangGraph state-based agent framework
- **Best for**: Complex workflows, state management, branching logic
- **Features**: State graphs, conditional routing, cycle handling

## Generated Project Structure

```
project-name/
├── src/
│   ├── nodes/              # Agent execution nodes
│   │   ├── retrieve/
│   │   │   ├── logic.py    # Node execution logic
│   │   │   └── prompts.py  # Prompt definitions
│   │   ├── reason/
│   │   └── act/
│   ├── main.py             # Application entry point
│   ├── config.py           # Configuration management
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## Node Structure

Each node contains two main files:

### logic.py
```python
from handit_ai import tracing
from .prompts import get_prompts

@tracing(agent="NodeName")
class NodeLogic:
    def __init__(self, config):
        self.config = config
        self.prompts = get_prompts()
    
    async def execute(self, input_data):
        """
        Main execution logic for this node.
        Customize this method with your specific logic.
        """
        # Your custom logic here
        result = await self.process_input(input_data)
        return result
    
    async def process_input(self, data):
        # Implement your processing logic
        pass
```

### prompts.py
```python
def get_prompts():
    """
    Define prompts for this node.
    Customize these prompts for your specific use case.
    """
    return {
        "system": "You are a helpful AI assistant...",
        "user_template": "Process this input: {input}",
        "examples": [
            {"input": "example input", "output": "example output"}
        ]
    }
```

## Handit Integration

All generated Python projects include automatic Handit.ai integration:

```python
# Automatic imports
from handit_ai import configure, tracing
import os

# Configuration
configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

# Tracing decorators
@tracing(agent="AgentName")
async def main_function():
    # Your code here
    pass
```

## Dependencies

Generated projects include these key dependencies:

- **handit_ai**: Handit.ai monitoring and tracing
- **fastapi**: Web framework (for FastAPI runtime)
- **uvicorn**: ASGI server (for FastAPI runtime)
- **langchain**: LangChain framework (if selected)
- **langgraph**: LangGraph framework (if selected)
- **pydantic**: Data validation
- **python-dotenv**: Environment variable management

## Configuration

Environment variables are managed through `.env` files:

```bash
# .env.example
HANDIT_API_KEY=your_handit_api_key_here
MODEL_PROVIDER=mock
MODEL_NAME=mock-llm
PORT=8000
MEMORY_STORAGE=faiss-local
CACHE_STORAGE=in-memory
SQL_STORAGE=sqlite
```

## Testing

Generated projects include a test structure:

```python
# tests/test_nodes.py
import pytest
from src.nodes.retrieve.logic import NodeLogic

@pytest.mark.asyncio
async def test_retrieve_node():
    logic = NodeLogic(config={})
    result = await logic.execute({"input": "test"})
    assert result is not None
```

## Best Practices

Generated Python projects follow these best practices:

- **Type hints**: All functions include proper type annotations
- **Async/await**: Proper async programming patterns
- **Error handling**: Comprehensive exception handling
- **Logging**: Structured logging with appropriate levels
- **Configuration**: Environment-based configuration management
- **Testing**: Pre-configured test structure with pytest
- **Documentation**: Comprehensive docstrings and comments

## Customization

After generation, customize your agent by:

1. **Implementing node logic**: Edit `src/nodes/*/logic.py`
2. **Customizing prompts**: Modify `src/nodes/*/prompts.py`
3. **Adding tools**: Implement additional tools in `src/tools/`
4. **Configuring models**: Update model settings in `src/config.py`
5. **Adding middleware**: Customize FastAPI middleware (for FastAPI runtime)

## Examples

See the `examples/` directory for sample Python agent configurations and generated code.
