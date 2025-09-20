/**
 * Simple configuration for Custom JS Agent
 * Only includes what's actually needed for the agent to run.
 */

class Config {
    /**
     * Simple configuration class - only essential properties.
     * The generator handles folder/file structure based on JSON config.
     */
    
    constructor() {
        // Basic project info
        this.project_name = 'Custom JS Agent';
        this.framework = 'langgraph';
        
        // Runtime info
        this.runtime_type = 'express';
        this.port = 3000;
        
        // Agent stages (the actual workflow)
        this.agent_stages = ["llm_1","llm_2","llm_3"];
        
        // Environment variables (for actual runtime configuration)
        this.handit_api_key = process.env.HANDIT_API_KEY;
        this.model_provider = process.env.MODEL_PROVIDER || 'mock';
        this.model_name = process.env.MODEL_NAME || 'mock-llm';
    }
    
    getModelConfig(nodeName = null) {
        /**
         * Get model configuration for a node.
         * 
         * @param {string} nodeName - Optional node name for node-specific config
         * @returns {object} Model configuration
         */
        return {
            provider: this.model_provider,
            name: this.model_name
        };
    }
    
    getNodeToolsConfig(nodeName) {
        /**
         * Get tools for a specific node.
         * 
         * @param {string} nodeName - Name of the node
         * @returns {string[]} List of available tools (empty for now - implement as needed)
         */
        // Return empty list by default - tools can be added per node as needed
        return [];
    }
}

export default Config;
