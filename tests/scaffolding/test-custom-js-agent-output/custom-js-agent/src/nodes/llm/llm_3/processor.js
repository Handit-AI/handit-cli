/**
 * Llm_3 LLM node processor
 */

import { BaseLLMNode } from '../../../base.js';
import { getPrompts } from './prompts.js';

export class Llm_3LLMNode extends BaseLLMNode {
  constructor(config = null) {
    super('llm_3', config);
  }

  async process(inputData) {
    try {
      // Execute with timeout (longer for LLM calls)
      const result = await Promise.race([
        this._execute_llm_3_llm_logic(inputData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout in llm_3 after 60 seconds')), 60000)
        )
      ]);

      return {
        node: this.node_name,
        status: 'success',
        result: result
      };
    } catch (error) {
      console.error(`Error in ${this.node_name}:`, error.message);
      throw error;
    }
  }

  async _execute_llm_3_llm_logic(inputData) {
    // Implement your LLM logic here
    const prompts = getPrompts();
    
    // Example implementation
    return {
      message: `Processing in ${this.node_name} with input: ${JSON.stringify(inputData)}`,
      prompts: prompts
    };
  }
}