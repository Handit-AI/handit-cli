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
    const serviceContent =
      this.language === 'javascript'
        ? this.generateJSHanditService()
        : this.generatePythonHanditService();

    const fileName =
      this.language === 'javascript'
        ? 'handit_service.js'
        : 'handit_service.py';
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
   * Generate structured changes for instrumenting a function
   */
  async generateInstrumentedFunction(node, originalCode, allNodes, apiKey) {
    try {
      const prompt = this.createStructuredInstrumentationPrompt(
        node,
        originalCode,
        allNodes,
        apiKey
      );

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `You are an expert code instrumentation assistant. Your job is to integrate the Handit.ai observability SDK into a user’s codebase **without a configuration file**. You are given:

- A complete **call graph** (list of all functions that must be traced)
- The **source code of those functions**, each with filename and line numbers
- The **Handit SDK documentation**, including initialization and tracing usage
- The assumption that the SDK has already been installed

Your output must be a **single JSON object** describing the minimal, line-precise changes required to instrument the given functions.

---

## 🔍 Your Job

For each function in the call graph:
1. **Add tracing code using the Handit.ai SDK**, following the patterns in the documentation.
2. Add:
   - startTracing() at the beginning of the agent
   - trackNode() inside model/tool nodes
   - endTracing() at the end of the agent (or final call)
3. If Handit initialization is missing, include code to:
   - Import the SDK
   - Initialize/configure it
4. Return the full code with the changes applied. And make sure it compiles.

Be sure that the code is valid and compiles, check removals and additions and make sure the code is valid and compiles.


IMPORTANT: Always check all the code, do not add to additions code that is already present. Also always keep the standard that when adding an no removing then the code that is already present will go to the end of the adding.

If the code already has the handit integration, do not add it again.
---

## 📦 OUTPUT FORMAT

Return ONLY a JSON object with this structure:

json
{
  "additions": [
    {
      "line": <line_number_where_to_add>,
      "content": "<code_to_add>"
    }
  ],
  "removals": [
    {
      "line": <line_number_to_remove>,
      "content": "<code_being_removed>"
    }
  ],
  "full_code": "<full_code_with_changes>"
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const structuredResponse = response.choices[0].message.content;
      return this.parseStructuredResponse(structuredResponse, originalCode);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not generate instrumentation for ${node.name}: ${error.message}`
        )
      );
      return { additions: [], removals: [] }; // Return empty changes if AI fails
    }
  }

  /**
   * Create structured instrumentation prompt
   */
  createStructuredInstrumentationPrompt(node, originalCode, allNodes, apiKey) {
    const isEntryPoint = allNodes[0]?.id === node.id;
    // load quickstart.mdx as string
    const documentation = fs.readFileSync(
      path.join(__dirname, '..', '..', 'quickstart.mdx'),
      'utf8'
    );

    const basePrompt = `
Generate structured changes to instrument this ${this.language} function with Handit.ai tracing.

The basic documentation for the handit integration is:
${documentation}

FUNCTION DETAILS:
- Name: ${node.name}
- File: ${node.file}
- Line: ${node.line}
- Agent Name: ${this.agentName}
- Is Entry Point: ${isEntryPoint}

ORIGINAL CODE:
\`\`\`${this.language}
${originalCode}
\`\`\`

REQUIREMENTS:
1. Generate structured changes in JSON format
2. Preserve ALL original function logic exactly
3. Add Handit.ai tracing appropriately
4. Use appropriate nodeType: Remember we only have two types of nodes: model and tool, model is used for LLM calls and tool is used for all other calls.
5. Only add startTracing and endTracing if this is the entry point, the other functions should receive the executionId from the parent function, as passed in the parameters.
6. Add the executionId to the parameters of the function, and pass it to the child functions, use the full structure of the nodes to determine the parameters.
7. Items are processed in the order they are added, so you need to add the executionId to the parameters of the function, and pass it to the child functions, use the full structure of the nodes to determine the parameters.
8. We need additions and removals:
    a. Additions: When we need to add new code to the function.
    b. Removals: When we need to remove code from the function.
9. Check the full code and always add removasls and additions where needed.

THIS IS THE FULL STRUCTURE OF THE NODES WE ARE TRACING:
${JSON.stringify(allNodes, null, 2)}

OUTPUT FORMAT:
Return ONLY a JSON object with this structure:
{
  "additions": [
    {
      "line": <line_number_where_to_add>,
      "content": "<code_to_add>"
    }
  ],
  "removals": [
    {
      "line": <line_number_to_remove>,
      "content": "<code_being_removed>"
    }
  ],
}

${isEntryPoint ? `ENTRY POINT: Add startTracing() at beginning and endTracing() in finally block, also add the file add config({ apiKey: process.env.HANDIT_API_KEY }) the api key must be  ${apiKey} ` : 'CHILD FUNCTION: Accept executionId parameter and use trackNode()'}

Return ONLY the JSON object, no explanations.`;

    return basePrompt;
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
      return (
        basePrompt +
        `
5. This is the ENTRY POINT - add startTracing() at the beginning and endTracing() at the end
6. Pass executionId to child functions that need tracing
7. Use try/finally to ensure endTracing() is always called

ENTRY POINT PATTERN:
- Call startTracing({ agentName: "${this.agentName}" })
- Get executionId from response
- Track this function with trackNode()
- Pass executionId to child functions
- Call endTracing() in finally block

Return ONLY the instrumented code, no explanations.`
      );
    } else {
      return (
        basePrompt +
        `
5. This is a CHILD function - accept executionId parameter and use trackNode()
6. Add executionId parameter to function signature
7. Track function execution with trackNode()

CHILD FUNCTION PATTERN:
- Accept executionId as parameter
- Track with trackNode({ input, output, nodeName: "${node.name}", agentName: "${this.agentName}", nodeType: "${nodeType}", executionId })
- Return original result

Return ONLY the instrumented code, no explanations.`
      );
    }
  }

  /**
   * Create Python instrumentation prompt
   */
  createPythonInstrumentationPrompt(
    node,
    originalCode,
    isEntryPoint,
    nodeType
  ) {
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
      return (
        basePrompt +
        `
5. This is the ENTRY POINT - add tracker.start_tracing() at the beginning and tracker.end_tracing() at the end
6. Pass execution_id to child functions that need tracing
7. Use try/finally to ensure end_tracing() is always called

ENTRY POINT PATTERN:
- Call tracker.start_tracing(agent_name="${this.agentName}")
- Get execution_id from response
- Track this function with tracker.track_node()
- Pass execution_id to child functions
- Call tracker.end_tracing() in finally block

Return ONLY the instrumented code, no explanations.`
      );
    } else {
      return (
        basePrompt +
        `
5. This is a CHILD function - accept execution_id parameter and use tracker.track_node()
6. Add execution_id parameter to function signature
7. Track function execution with tracker.track_node()

CHILD FUNCTION PATTERN:
- Accept execution_id as parameter
- Track with tracker.track_node(input=input, output=output, node_name="${node.name}", agent_name="${this.agentName}", node_type="${nodeType}", execution_id=execution_id)
- Return original result

Return ONLY the instrumented code, no explanations.`
      );
    }
  }

  /**
   * Parse structured response from AI
   */
  parseStructuredResponse(response, originalCode) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const structuredChanges = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (
        !structuredChanges.additions ||
        !structuredChanges.removals
      ) {
        throw new Error('Invalid structured response format');
      }

      return structuredChanges;
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not parse structured response: ${error.message}`
        )
      );
      return { additions: [], removals: [] };
    }
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

        if (
          !inFunction &&
          (line.includes('function') ||
            line.includes('=>') ||
            line.includes('def '))
        ) {
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
      console.warn(
        chalk.yellow(
          `Warning: Could not read function code for ${node.name}: ${error.message}`
        )
      );
      return `// Original function: ${node.name}`;
    }
  }
}

module.exports = { CodeGenerator };
