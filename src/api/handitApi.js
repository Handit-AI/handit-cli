const axios = require('axios');
const { EnvironmentConfig } = require('../config/environment');

class HanditApi {
  constructor() {
    this.config = new EnvironmentConfig();
    this.apiUrl = this.config.getApiUrl();
    this.authToken = null;
    this.apiToken = null;
    this.stagingApiToken = null;
  }

  /**
   * Authenticate CLI with code from dashboard
   */
  async authenticateWithCode(code) {
    try {
      const response = await axios.post(`${this.apiUrl}/cli/auth/status`, {
        code: code
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'success') {
        this.authToken = response.data.authToken;
        this.apiToken = response.data.apiToken;
        this.stagingApiToken = response.data.stagingApiToken;
        
        return {
          success: true,
          user: response.data.user,
          company: response.data.company,
          authToken: this.authToken,
          apiToken: this.apiToken,
          stagingApiToken: this.stagingApiToken
        };
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Authentication failed: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.apiToken) {
      headers['X-API-Token'] = this.apiToken;
    }

    return headers;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.apiUrl}/health`, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  /**
   * Get CLI auth URL
   */
  getCliAuthUrl() {
    return this.config.getCliAuthUrl();
  }

  /**
   * Check if we're in test mode
   */
  isTestMode() {
    return this.config.isTestMode();
  }

  /**
   * Generate code using Handit API
   */
  async generateCode(prompt) {
    try {
      const response = await axios.post(`${this.apiUrl}/ai/generate`, {
        prompt: prompt,
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data && response.data.content) {
        return response.data.content;
      } else {
        throw new Error('Invalid response from Handit API');
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Test connection with agent name
   */
  async testConnectionWithAgent(agentName) {
    try {
      const response = await axios.post(`${this.apiUrl}/setup/test-connection-cli`, {
        agentName: agentName
      }, {
        headers: this.getAuthHeaders()
      });

      if (response.data && response.data.connected === true) {
        return { success: true, connected: true };
      } else {
        return { success: true, connected: false };
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get list of existing integration tokens
   */
  async getIntegrationTokensList(limit, offset) {
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;

      const response = await axios.get(`${this.apiUrl}/integration-tokens`, {
        params,
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Create a new integration token
   */
  async createIntegrationToken(providerId, name, token, type) {
    try {
      const requestBody = {
        providerId,
        name,
        token
      };
      if (type) requestBody.type = type;

      const response = await axios.post(`${this.apiUrl}/integration-tokens`, requestBody, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get list of available providers
   */
  async getProviders(limit, offset) {
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;

      const response = await axios.get(`${this.apiUrl}/providers`, {
        params,
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get available evaluators/evaluation prompts
   */
  async getEvaluationPrompts(category, limit, offset) {
    try {
      const params = {};
      if (category) params.category = category;
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;

      const response = await axios.get(`${this.apiUrl}/reviewers-template/evaluation-prompts`, {
        params,
        headers: this.getAuthHeaders()
      });

      return response.data.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get user's models/nodes
   */
  async getUserModels(limit, offset) {
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;

      const response = await axios.get(`${this.apiUrl}/models/me`, {
        params,
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Associate an evaluator to a model
   */
  async associateEvaluatorToModel(modelId, evaluationPromptId) {
    try {
      const response = await axios.post(`${this.apiUrl}/reviewers-template/models/${modelId}/evaluation-prompts`, {
        evaluationPromptId
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Update evaluator with default integration token and provider model
   */
  async updateEvaluatorDefaults(id, defaultIntegrationTokenId, defaultProviderModel) {
    try {
      const response = await axios.put(`${this.apiUrl}/reviewers-template/evaluation-prompts/${id}`, {
        defaultIntegrationTokenId,
        defaultProviderModel
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get list of agents
   */
  async getAgents(limit, offset) {
    try {
      const params = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;
      console.log('--------------------------------');
      console.log(params);
      console.log(this.getAuthHeaders());
      console.log(`${this.apiUrl}/agents`);
      console.log('--------------------------------');
      const response = await axios.get(`${this.apiUrl}/agents`, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Handit API error: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Get user information including company ID
   */
  async getUserInfo() {
    try {
      const response = await axios.get(`${this.apiUrl}/users/me`, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Failed to get user info: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Connect repository for automatic PR creation
   */
  async connectRepository(repositoryData) {
    try {
      const response = await axios.post(`${this.apiUrl}/integrations/repository/connect`, repositoryData, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Repository connection failed: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Update agent with repository URL
   */
  async updateAgent(agentId, updateData) {
    try {
      const response = await axios.put(`${this.apiUrl}/agents/${agentId}`, updateData, {
        headers: this.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Agent update failed: ${error.response.data.message || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }
}

module.exports = { HanditApi }; 