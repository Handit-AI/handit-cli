"""
Llm_3 LLM node
"""

import asyncio
from typing import Any, Dict
from src.base import BaseLLMNode
from .prompts import get_prompts

class Llm_3LLMNode(BaseLLMNode):
    """
    Llm_3 LLM node implementation
    
    This node processes input using LLM capabilities for the llm_3 functionality.
    Customize the run() method to implement your specific LLM logic and AI system calls.
    """
    
    def __init__(self, config):
        super().__init__(config, "llm_3")
        # Load node-specific prompts
        self.node_prompts = get_prompts()
    
    async def run(self, input_data: Any) -> Any:
        """
        Execute the llm_3 LLM logic with comprehensive error recovery.
        
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
                    self._execute_llm_3_llm_logic(input_data),
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
    
    async def _execute_llm_3_llm_logic(self, data: Any) -> Any:
        """
        Execute the specific llm_3 LLM logic
        
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
        #     prompt=f"{system_prompt}\n\n{user_prompt.format(input=str(data))}",
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
