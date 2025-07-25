const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const OpenAI = require('openai');

/**
 * Generates instrumented code for selected functions using GPT-4.1-mini
 */
class CodeGenerator {
  constructor(language, agentName) {
    this.language = language;
    this.agentName = agentName;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate Handit service initialization file
   */
  async generateHanditService(projectRoot) {
    const serviceContent = this.language === 'javascript' ? 
      this.generateJSHanditService() : 
      this.generatePythonHanditService();
    
    const fileName = this.language === 'javascript' ? 'handit_service.js' : 'handit_service.py';
    const filePath = path.join(projectRoot, fileName);
    
    await fs.writeFile(filePath, serviceContent);
    console.log(chalk.green(`✓ Created ${fileName}`));
    
    return filePath;
  }

  /**
   * Generate JavaScript Handit service file
   */
  generateJSHanditService() {
    return `/**
 * Handit.ai service initialization.
 * This file creates the Handit.ai configuration for tracing your agent.
 */
const { config, startTracing, trackNode, endTracing } = require('@handit.ai/node');

// Configure Handit.ai with your API key
config({ 
    apiKey: process.env.HANDIT_API_KEY  // Sets up authentication for Handit.ai services
});

module.exports = {
  startTracing,
  trackNode,
  endTracing
};
`;
  }

  /**
   * Generate Python Handit service file
   */
  generatePythonHanditService() {
    return `"""
Handit.ai service initialization and configuration.
This file creates a singleton tracker instance that can be imported across your application.
"""
import os
from dotenv import load_dotenv
from handit import HanditTracker

# Load environment variables from .env file
load_dotenv()

# Create a singleton tracker instance
tracker = HanditTracker()  # Creates a global tracker instance for consistent tracing across the app

# Configure with your API key from environment variables
tracker.config(api_key=os.getenv("HANDIT_API_KEY"))  # Sets up authentication for Handit.ai services
`;
  }

  /**
   * Generate instrumented code for a specific function
   */
  async generateInstrumentedFunction(node, originalCode, allNodes) {
    try {
      const prompt = this.createInstrumentationPrompt(node, originalCode, allNodes);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code instrumentation assistant. Generate clean, production-ready code with Handit.ai tracing. Always preserve the original function logic exactly while adding tracing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const instrumentedCode = response.choices[0].message.content;
      return this.extractCodeFromResponse(instrumentedCode);
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not generate instrumentation for ${node.name}: ${error.message}`));
      return originalCode; // Return original code if AI fails
    }
  }

  /**
   * Create instrumentation prompt based on language and function type
   */
  createInstrumentationPrompt(node, originalCode, allNodes) {
    const isEntryPoint = allNodes[0]?.id === node.id;
    const nodeType = node.type === 'endpoint' ? 'endpoint' : 'tool';
    
    if (this.language === 'javascript') {
      return this.createJSInstrumentationPrompt(node, originalCode, isEntryPoint, nodeType);
    } else {
      return this.createPythonInstrumentationPrompt(node, originalCode, isEntryPoint, nodeType);
    }
  }

  /**
   * Create JavaScript instrumentation prompt
   */
  createJSInstrumentationPrompt(node, originalCode, isEntryPoint, nodeType) {
    const basePrompt = `
Instrument this ${this.language} function with Handit.ai tracing.

FUNCTION DETAILS:
- Name: ${node.name}
- File: ${node.file}
- Line: ${node.line}
- Type: ${nodeType}
- Agent Name: ${this.agentName}
- Is Entry Point: ${isEntryPoint}

ORIGINAL CODE:
\`\`\`javascript
${originalCode}
\`\`\`

REQUIREMENTS:
1. Add Handit.ai tracing using: const { startTracing, trackNode, endTracing } = require('./handit_service');
2. Preserve ALL original function logic exactly
3. Add proper error handling for tracing
4. Use appropriate nodeType: "${nodeType}"
`;

    if (isEntryPoint) {
      return basePrompt + `
5. This is the ENTRY POINT - add startTracing() at the beginning and endTracing() at the end
6. Pass executionId to child functions that need tracing
7. Use try/finally to ensure endTracing() is always called

ENTRY POINT PATTERN:
- Call startTracing({ agentName: "${this.agentName}" })
- Get executionId from response
- Track this function with trackNode()
- Pass executionId to child functions
- Call endTracing() in finally block

Return ONLY the instrumented code, no explanations.`;
    } else {
      return basePrompt + `
5. This is a CHILD function - accept executionId parameter and use trackNode()
6. Add executionId parameter to function signature
7. Track function execution with trackNode()

CHILD FUNCTION PATTERN:
- Accept executionId as parameter
- Track with trackNode({ input, output, nodeName: "${node.name}", agentName: "${this.agentName}", nodeType: "${nodeType}", executionId })
- Return original result

Return ONLY the instrumented code, no explanations.`;
    }
  }

  /**
   * Create Python instrumentation prompt
   */
  createPythonInstrumentationPrompt(node, originalCode, isEntryPoint, nodeType) {
    const basePrompt = `
Instrument this ${this.language} function with Handit.ai tracing.

FUNCTION DETAILS:
- Name: ${node.name}
- File: ${node.file}
- Line: ${node.line}
- Type: ${nodeType}
- Agent Name: ${this.agentName}
- Is Entry Point: ${isEntryPoint}

ORIGINAL CODE:
\`\`\`python
${originalCode}
\`\`\`

REQUIREMENTS:
1. Add Handit.ai tracing using: from handit_service import tracker
2. Preserve ALL original function logic exactly
3. Add proper error handling for tracing
4. Use appropriate nodeType: "${nodeType}"
`;

    if (isEntryPoint) {
      return basePrompt + `
5. This is the ENTRY POINT - add tracker.start_tracing() at the beginning and tracker.end_tracing() at the end
6. Pass execution_id to child functions that need tracing
7. Use try/finally to ensure end_tracing() is always called

ENTRY POINT PATTERN:
- Call tracker.start_tracing(agent_name="${this.agentName}")
- Get execution_id from response
- Track this function with tracker.track_node()
- Pass execution_id to child functions
- Call tracker.end_tracing() in finally block

Return ONLY the instrumented code, no explanations.`;
    } else {
      return basePrompt + `
5. This is a CHILD function - accept execution_id parameter and use tracker.track_node()
6. Add execution_id parameter to function signature
7. Track function execution with tracker.track_node()

CHILD FUNCTION PATTERN:
- Accept execution_id as parameter
- Track with tracker.track_node(input=input, output=output, node_name="${node.name}", agent_name="${this.agentName}", node_type="${nodeType}", execution_id=execution_id)
- Return original result

Return ONLY the instrumented code, no explanations.`;
    }
  }

  /**
   * Extract code from AI response, removing markdown formatting
   */
  extractCodeFromResponse(response) {
    // Remove markdown code blocks
    let code = response.replace(/```(?:javascript|python|js|py)?\n?/g, '');
    code = code.replace(/```\n?/g, '');
    
    // Clean up extra whitespace
    code = code.trim();
    
    return code;
  }

  /**
   * Get original function code from file
   */
  async getOriginalFunctionCode(node) {
    try {
      const filePath = path.resolve(node.file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Get function definition and body (simple extraction)
      // This is a basic implementation - could be enhanced with AST parsing
      const startLine = node.line - 1; // Convert to 0-based
      let endLine = startLine;
      let braceCount = 0;
      let inFunction = false;
      
      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        
        if (!inFunction && (line.includes('function') || line.includes('=>') || line.includes('def '))) {
          inFunction = true;
        }
        
        if (inFunction) {
          // Count braces/indentation to find function end
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          
          if (braceCount === 0 && i > startLine) {
            endLine = i;
            break;
          }
        }
      }
      
      // If we couldn't find the end, take a reasonable chunk
      if (endLine === startLine) {
        endLine = Math.min(startLine + 20, lines.length - 1);
      }
      
      return lines.slice(startLine, endLine + 1).join('\n');
      
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read function code for ${node.name}: ${error.message}`));
      return `// Original function: ${node.name}`;
    }
  }
}

module.exports = { CodeGenerator }; 