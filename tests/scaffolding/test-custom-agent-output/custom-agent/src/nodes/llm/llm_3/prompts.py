"""
Prompt definitions for the llm_3 LLM node
"""

from typing import Dict, List, Any

def get_prompts() -> Dict[str, Any]:
    """
    Define prompts for the llm_3 LLM node.
    
    Customize these prompts for your specific use case.
    
    Returns:
        Dictionary containing prompt templates and examples
    """
    return {
        "system": f"""You are a helpful AI assistant specialized in llm_3 tasks.

Your role is to:
- Process input data for the llm_3 stage
- Apply appropriate llm_3 logic using LLM capabilities
- Return structured results for the next stage

Guidelines:
- Be precise and focused on llm_3 functionality
- Maintain consistency with the overall agent workflow
- Handle errors gracefully
- Provide clear, actionable outputs""",

        "user_template": """Process the following input for the llm_3 LLM stage:

Input: {input}

Context: {context}

Please provide a structured response that can be used by the next stage in the pipeline.""",

        "examples": [
            {
                "input": f"Sample input for llm_3",
                "output": f"Sample LLM output from llm_3",
                "context": "Example context"
            }
        ],
        
        "error_handling": {
            "invalid_input": f"The input provided is not valid for llm_3 LLM processing.",
            "processing_error": f"An error occurred while processing the input in llm_3 LLM.",
            "timeout": f"The llm_3 LLM processing timed out."
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
        "llm_3": {
            "description": "Customize this description for the llm_3 node functionality",
            "focus": "Define the specific focus and purpose of the llm_3 node",
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
