const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const OpenAI = require('openai');

/**
 * Generates instrumented code for selected functions using GPT-4o-mini
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
   * Two-step approach: 1) Generate complete code, 2) Compare to create additions/removals
   */
  async generateInstrumentedFunction(node, originalCode, allNodes, apiKey) {
    try {
      // Step 1: Generate the complete instrumented code
      const instrumentedCode = await this.generateCompleteInstrumentedCode(
        node,
        originalCode,
        allNodes,
        apiKey
      );

      if (instrumentedCode === originalCode) {
        return { changes: { additions: [], removals: [] }, originalArray: [], instrumentedArray: [] };
      }

      // Step 2: Generate additions/removals by comparing original vs new code
      const { changes, originalArray, instrumentedArray } =
        await this.generateChangesFromComparison(
          originalCode,
          instrumentedCode,
          node
        );
     
      return { changes, originalArray, instrumentedArray };
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
   * Step 1: Generate complete instrumented code
   */
  async generateCompleteInstrumentedCode(node, originalCode, allNodes, apiKey) {
    const prompt = this.createInstrumentationPrompt(
      node,
      originalCode,
      allNodes,
      apiKey
    );

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert code instrumentation assistant. Your job is to integrate the Handit.ai observability SDK into a user's codebase.

Your task is to generate the COMPLETE instrumented function code with Handit.ai tracing added.

DO NOT ADD NEW FUNCTIONS WHEN NO NEEDED, WE ARE GOING TO PROCESS A LOT OF FUNCTIONS IN AN ITERATIVE WAY, YOU ARE GOING TO GET THE TREE OF EXECUTION.

IMPORTANT RULES:
1. Return ONLY the complete instrumented code, no explanations
2. Preserve ALL original function logic exactly
3. Add Handit.ai tracing appropriately
4. Make sure the code compiles and is valid
5. Use appropriate nodeType: 'model' for LLM calls, 'tool' for all other calls
6. Only add startTracing() and endTracing() for entry points
7. For child functions, accept executionId parameter and use trackNode()
8. Add executionId to function parameters and pass to child functions
9. If Handit integration already exists, don't add it again
10. Never add additional imports that are not needed, just import handit functions. 
11. Use the apiKey provided to you to configure the Handit.ai SDK, but just add it to the entry point.
12. If handit is already configured or called in the function, return the parameter of required changes as false, else return true.

Return everything in the following json format:


{
    "code": "instrumented code",
    "requiredChanges": true/false
}`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const answer = JSON.parse(response.choices[0].message.content);

    if (answer.requiredChanges) {
      return answer.code;
    } else {
      return originalCode;
    }
  }

  /**
   * Step 2: Generate additions/removals by comparing original vs new code using AI
   */
  async generateChangesFromComparison(originalCode, instrumentedCode, node) {
    // Step 2a: Normalize original code to array with line numbers
    const originalArray = await this.normalizeCodeToArray(
      originalCode,
      node,
      'original'
    );

    // Step 2b: Normalize instrumented code to array with line numbers
    const instrumentedArray = await this.normalizeCodeToArray(
      instrumentedCode,
      node,
      'instrumented'
    );

    // Step 2c: Compare arrays and generate changes
    const changes = this.compareArrays(originalArray, instrumentedArray);
    return {
      changes,
      originalArray,
      instrumentedArray,
    };
  }

  /**
   * Step 2a/2b: Normalize code to array with line numbers
   */
  async normalizeCodeToArray(code, node, type) {
    const prompt = this.createNormalizePrompt(code, node, type);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert code normalizer. Your ONLY job is to convert code into a JSON array with line numbers.

🚫 DO NOT ADD OR REMOVE LINES — just reformat the provided code using proper line numbers.
🚫 DO NOT GUESS LINE NUMBERS — only use the ones explicitly defined: lines 1–5 for Handit config/imports, and \`${node.line}\` for the function block start.
🚫 DO NOT ADD OR INFER EXTRA IMPORTS — only format what is provided.

---

✅ CRITICAL RULES:

1. **Import/Config Section (Lines 1–5)**:
   - Any line that contains \`@handit.ai/*\` or \`config(...)\` must be placed starting from line 1.
   - These lines should be kept in the same order as in the input.
   - Do not add any non-Handit imports to lines 1–5.

2. **Function Section**:
   - All lines outside the Handit import/config section must start **exactly** at line \`${node.line}\`.
   - Maintain the original line order and content.
   - The first line of this section should match the function definition line in the original input.

3. **Preserve Formatting**:
   - Do not modify indentation, spacing, or blank lines.
   - Every line from the original input must appear **exactly once** in the output, unless it's skipped explicitly by rules (e.g., unrelated top-level imports).

4. **Never add lines**:
   - Do not add new imports (like \`const express = require(...)\`)
   - Do not add new line breaks.
   - Do not generate variable declarations that were not included in the input.

5. **Output Format**:
Return a JSON array like this:

[
  { "lineNumber": 1, "code": "import { startTracing } from '@handit.ai/node';" },
  { "lineNumber": 2, "code": "config({ apiKey: process.env.HANDIT_API_KEY });" },
  { "lineNumber": 10, "code": "app.post('/process-document', async (req, res) => {" },
  { "lineNumber": 11, "code": "  try {" },
  ...
]

---

📌 EXAMPLES

EXAMPLE 1:
Input Code:
\`\`\`
import { startTracing, config } from '@handit.ai/node';
config({ apiKey: process.env.KEY });

function helloWorld() {
  console.log("Hi");
}
\`\`\`

Context:
- node.line = 10

Output:
[
  { "lineNumber": 1, "code": "import { startTracing, config } from '@handit.ai/node';" },
  { "lineNumber": 2, "code": "config({ apiKey: process.env.KEY });" },
  { "lineNumber": 10, "code": "function helloWorld() {" },
  { "lineNumber": 11, "code": "  console.log("Hi");" },
  { "lineNumber": 12, "code": "}" }
]

EXAMPLE 2:
Input Code:
\`\`\`
app.post('/x', (req, res) => {
  res.send("ok");
});
\`\`\`

Context:
- node.line = 20

Output:
[
  { "lineNumber": 20, "code": "app.post('/x', (req, res) => {" },
  { "lineNumber": 21, "code": "  res.send("ok");" },
  { "lineNumber": 22, "code": "});" }
]

---

📢 FINAL NOTE: 
Only return the JSON array, do not explain, comment, or add any content outside the code.
]`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    try {
      const jsonMatch =
        response.choices[0].message.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not parse ${type} code array: ${error.message}`
        )
      );
      return [];
    }
  }

  /**
   * Create normalize prompt for code
   */
  createNormalizePrompt(code, node, type) {
    return `
Normalize this ${type} code into an array with line numbers.

CONTEXT:
- Function: ${node.name}
- File: ${node.file}
- Function starts at line: ${node.line} in the original file
- Type: ${type} code
- Node line: ${node.line} (this is where the function definition starts)

${type.toUpperCase()} CODE:
\`\`\`
${code}
\`\`\`

TASK:
1. Format the code as a JSON array where each object has:
   - "lineNumber": the correct line number
   - "code": the exact line of code, unmodified

2. Lines that include \`@handit.ai/*\` imports or \`config(...)\` **must** go at the top, starting at line 1.

3. The first line that is **not a Handit import/config** must start **exactly at line ${node.line}**.
   - This line MUST be the function or main logic definition.
   - Do NOT try to compute or guess it — just place the first non-import line at line ${node.line} exactly.

4. Continue numbering sequentially from there.

5. Preserve indentation, blank lines, and comments exactly as they appear.
6. NEVER add new code or modify any line.

OUTPUT FORMAT:
Return ONLY a JSON array like this:
[
  { "lineNumber": 1, "code": "import { startTracing } from '@handit.ai/node';" },
  { "lineNumber": 10, "code": "app.post('/x', (req, res) => {" },
  ...
]
`;
  }

  /**
   * Step 2c: Compare arrays and generate changes
   */
  compareArrays(originalArray, instrumentedArray) {
    const additions = [];
    const removals = [];
    const fullCode = [];

    // Extract just the code content for comparison
    const originalCodes = originalArray.map((item) => item.code);
    const instrumentedCodes = instrumentedArray.map((item) => item.code);

    // Find lines that are truly new (not just shifted)
    const newLines = instrumentedCodes.filter(
      (code) => !originalCodes.includes(code)
    );

    // Find lines that are truly removed (not just shifted)
    const removedLines = originalCodes.filter(
      (code) => !instrumentedCodes.includes(code)
    );

    // Get the function start line from the original array
    const functionStartLine = Math.min(
      ...originalArray.map((item) => item.lineNumber)
    );

    // Add imports/config additions (lines 1-5)
    for (const item of instrumentedArray) {
      if (item.lineNumber >= 1 && item.lineNumber < functionStartLine) {
        if (newLines.includes(item.code)) {
          additions.push({
            line: item.lineNumber,
            content: item.code,
          });
          fullCode.push({
            lineNumber: item.lineNumber,
            code: item.code,
            type: 'add',
          });
        }
      }
    }

    for (const item of instrumentedArray) {
      if (item.lineNumber >= functionStartLine) {
        if (newLines.includes(item.code)) {
          additions.push({
            line: item.lineNumber,
            content: item.code,
          });
          fullCode.push({
            lineNumber: item.lineNumber,
            code: item.code,
            type: 'add',
          });
        } else {
          fullCode.push({
            lineNumber: item.lineNumber,
            code: item.code,
            type: 'keep',
          });
        }
      }
    }

    for (const item of originalArray) {
      if (item.lineNumber >= functionStartLine) {
        if (removedLines.includes(item.code)) {
          removals.push({
            line: item.lineNumber,
            content: item.code,
          });
          const addsBefore = fullCode.filter(
            (tm) =>
              tm.lineNumber < item.lineNumber &&
              tm.type === 'add' &&
              tm.lineNumber >= functionStartLine
          );

          const removalsBefore = fullCode.filter(
            (tm) =>
              tm.lineNumber < item.lineNumber &&
              tm.type === 'remove' &&
              tm.lineNumber >= functionStartLine
          );
          fullCode.push({
            lineNumber: item.lineNumber + addsBefore.length - removalsBefore.length,
            code: item.code,
            type: 'remove',
          });
        }
      }
    }

    fullCode.sort((a, b) => a.lineNumber - b.lineNumber);

    // Return line-by-line changes (no grouping)
    return {
      additions: additions,
      removals: removals,
      fullCode: fullCode,
    };
  }

  /**
   * Group consecutive changes into single entries
   */
  groupConsecutiveChanges(changes) {
    if (changes.length === 0) return [];

    const grouped = [];
    let currentGroup = [changes[0]];

    for (let i = 1; i < changes.length; i++) {
      const current = changes[i];
      const previous = changes[i - 1];

      // Check if consecutive
      if (current.line === previous.line + 1) {
        currentGroup.push(current);
      } else {
        // End current group and start new one
        if (currentGroup.length > 0) {
          grouped.push(this.mergeGroup(currentGroup));
        }
        currentGroup = [current];
      }
    }

    // Add last group
    if (currentGroup.length > 0) {
      grouped.push(this.mergeGroup(currentGroup));
    }

    return grouped;
  }

  /**
   * Merge a group of consecutive changes into one
   */
  mergeGroup(group) {
    if (group.length === 1) return group[0];

    const firstLine = group[0].line;
    const content = group.map((change) => change.content).join('\n');

    return {
      line: firstLine,
      content: content,
    };
  }

  /**
   * Parse comparison response from AI
   */
  parseComparisonResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const changes = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!changes.additions || !changes.removals) {
        throw new Error('Invalid comparison response format');
      }

      return changes;
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not parse comparison response: ${error.message}`
        )
      );
      return { additions: [], removals: [] };
    }
  }

  /**
   * Create instrumentation prompt for generating complete code
   */
  createInstrumentationPrompt(node, originalCode, allNodes, apiKey) {
    const isEntryPoint = allNodes[0]?.id === node.id;
    // load quickstart.mdx as string
    const documentation = fs.readFileSync(
      path.join(__dirname, '..', '..', 'quickstart.mdx'),
      'utf8'
    );

    const basePrompt = `
Generate the complete instrumented code for this ${this.language} function with Handit.ai tracing.

The basic documentation for the handit integration is:
${documentation}

FUNCTION DETAILS:
- Name: ${node.name}
- File: ${node.file}
- Line: ${node.line}
- Agent Name: ${this.agentName}
- Is Entry Point: ${isEntryPoint}
- API Token: ${apiKey}

ORIGINAL CODE:
\`\`\`${this.language}
${originalCode}
\`\`\`

REQUIREMENTS:
1. Return the COMPLETE instrumented function code
2. Preserve ALL original function logic exactly
3. Add Handit.ai tracing appropriately
4. Use appropriate nodeType: 'model' for LLM calls, 'tool' for all other calls
5. Only add startTracing() and endTracing() if this is the entry point
6. For child functions, accept executionId parameter and use trackNode()
7. Add executionId to function parameters and pass to child functions
8. If Handit integration already exists, don't add it again
9. Add the executionId to the parameters of the function, and pass it to the child functions, use the full structure of the nodes to determine the parameters.
10. Items are processed in the order they are added, so you need to add the executionId to the parameters of the function, and pass it to the child functions, use the full structure of the nodes to determine the parameters.
11. If handit is already configured, return the parameter of required changes as false, else return true.


THIS IS THE FULL STRUCTURE OF THE NODES WE ARE TRACING:
${JSON.stringify(allNodes, null, 2)}

ALSO DO NOT ADD ADDITIONAL FUNCTIONS OR CODE WE DO NOT NEED. REMEMBER THAT THE FULL STRUCTURE FUNCTIONS IS ALREADY IMPLEMENTED.


${isEntryPoint ? `ENTRY POINT: Add startTracing() at beginning and endTracing() in finally block, also add config({ apiKey: process.env.HANDIT_API_KEY })` : 'CHILD FUNCTION: Accept executionId parameter, use trackNode() and import the trackNode function'}

Return everything in the format


{
    "code": "instrumented code",
    "requiredChanges": true/false
}
`;

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
      if (!structuredChanges.additions || !structuredChanges.removals) {
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
