# Llm_2 LLM Node

This folder contains the implementation for the **llm_2** LLM node of the Custom Agent agent.

## Files

- **`processor.py`** - Contains the main processing logic for this LLM node
- **`prompts.py`** - Contains prompt definitions and templates
- **`__init__.py`** - Makes this directory a Python package

## Purpose

The llm_2 LLM node is responsible for:
- Processing data using Large Language Model capabilities
- Applying prompts and generating intelligent responses
- Providing AI-powered reasoning and analysis

## Model Configuration

This LLM node uses:
- **Provider**: openai
- **Model**: gpt-4

## Usage

```python
from src.nodes.llm.llm_2.processor import Llm_2LLMNode

# Initialize the LLM node
node = Llm_2LLMNode(config)

# Run the LLM node
result = await node.run(input_data)

# Get model information
model_info = node.get_model_info()
```

## Configuration

This LLM node uses the following configuration:
- **Type**: LLM Node
- **Model**: Node-specific model configuration
- **Prompts**: Custom prompt templates
- **Storage**: none/in-memory/none

## Customization

To customize this LLM node:

1. **Modify Processor**: Edit `processor.py` to change the LLM processing behavior
2. **Update Prompts**: Edit `prompts.py` to modify prompt templates
3. **Change Model**: Update the model configuration for this specific node
4. **Add Context**: Enhance prompts with additional context

## Handit Integration

This LLM node is automatically traced by Handit.ai for monitoring and observability.
