# Llm_1 Tool Node

This folder contains the implementation for the **llm_1** tool node of the Custom Agent agent.

## Files

- **`processor.py`** - Contains the main processing logic for this tool node
- **`__init__.py`** - Makes this directory a Python package

## Purpose

The llm_1 tool node is responsible for:
- Executing tool-based operations
- Processing data using available tools
- Providing tool-specific functionality

## Available Tools

This node has access to the following tools:
- web_search

## Usage

```python
from src.nodes.tools.llm_1.processor import Llm_1ToolNode

# Initialize the tool node
node = Llm_1ToolNode(config)

# Run the tool node
result = await node.run(input_data)

# Get available tools
tools = node.get_available_tools()
```

## Configuration

This tool node uses the following configuration:
- **Type**: Tool Node
- **Available Tools**: Node-specific tools
- **Storage**: none/in-memory/none

## Customization

To customize this tool node:

1. **Modify Processor**: Edit `processor.py` to change the tool processing behavior
2. **Add Tools**: Update the tools configuration for this specific node
3. **Tool Integration**: Implement specific tool integrations in the logic

## Note

Tool nodes do not have prompts - they focus on tool execution and data processing.
