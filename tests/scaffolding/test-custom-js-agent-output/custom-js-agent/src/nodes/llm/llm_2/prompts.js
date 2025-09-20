/**
 * Prompts for llm_2 LLM node
 */

export function getPrompts() {
  return {
    system: "You are a helpful AI assistant in the llm_2 node.",
    user: "Please process the following input:",
    examples: []
  };
}