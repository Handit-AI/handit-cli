/**
 * Prompts for llm_1 LLM node
 */

export function getPrompts() {
  return {
    system: "You are a helpful AI assistant in the llm_1 node.",
    user: "Please process the following input:",
    examples: []
  };
}