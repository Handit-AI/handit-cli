/**
 * Base classes for LLM and Tool nodes
 */

import Config from './config.js';

/**
 * Base class for LLM nodes
 */
export class BaseLLMNode {
  constructor(nodeName, config = null) {
    this.node_name = nodeName;
    this.config = config || new Config();
  }

  async process(inputData) {
    throw new Error('process method must be implemented by subclass');
  }

  async _execute_llm_logic(inputData) {
    throw new Error('_execute_llm_logic method must be implemented by subclass');
  }
}

/**
 * Base class for Tool nodes
 */
export class BaseToolNode {
  constructor(nodeName, config = null) {
    this.node_name = nodeName;
    this.config = config || new Config();
  }

  async process(inputData) {
    throw new Error('process method must be implemented by subclass');
  }

  async _execute_tool_logic(inputData) {
    throw new Error('_execute_tool_logic method must be implemented by subclass');
  }
}