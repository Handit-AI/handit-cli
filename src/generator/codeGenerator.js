const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { callLLMAPI } = require('../utils/openai');

/**
 * Generates instrumented code for selected functions using GPT-4o-mini
 */
class CodeGenerator {
  constructor(language, agentName, projectRoot = null) {
    this.language = language;
    this.agentName = agentName;
    this.projectRoot = projectRoot;
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
        return {
          changes: { additions: [], removals: [] },
          originalArray: [],
          instrumentedArray: [],
        };
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
    // Detect if this is a FastAPI endpoint
    const isFastAPIEndpoint = this.language === 'python' ? await this.detectFastAPIEndpoint(node) : false;
    
    const prompt = this.createInstrumentationPrompt(
      node,
      originalCode,
      allNodes,
      apiKey,
      isFastAPIEndpoint
    );

    const response = await callLLMAPI({
      messages: [
        {
          role: 'system',
          content: `You are an expert code instrumentation assistant. Your job is to integrate the Handit.ai observability SDK into a user's codebase.

Your task is to generate the COMPLETE instrumented function code with SIMPLIFIED Handit.ai tracing added ONLY to the entry point.

IMPORTANT RULES:
1. Return ONLY the complete instrumented code, no explanations
2. Preserve ALL original function logic exactly
3. Add Handit.ai tracing ONLY to the entry point function - no tracing for child functions
4. Make sure the code compiles and is valid
5. If Handit integration already exists, don't add it again
6. Never add additional imports that are not needed
7. The user API Key is ${apiKey}

PYTHON APPROACH:
- Use @tracing(agent="agent-name") decorator on the entry point function
- Import: from handit_ai import tracing, configure
- Add configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY")) at the top
- For FastAPI endpoints, put the decorator below the @app.post/@app.get decorator

JAVASCRIPT APPROACH:
- Use startTracing/endTracing wrapper around the entry point function
- Import: import { configure, startTracing, endTracing } from '@handit.ai/handit-ai'
- Add configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY }) at the top
- Wrap function body with try/finally and startTracing/endTracing calls

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
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.1
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

    const response = await callLLMAPI({
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
      model: 'gpt-4o-mini',
      temperature: 0.1
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
            lineNumber:
              item.lineNumber + addsBefore.length - removalsBefore.length,
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
  createInstrumentationPrompt(node, originalCode, allNodes, apiKey, isFastAPIEndpoint = false) {
    const isEntryPoint = true; // We only instrument entry points now
    
    const basePrompt = `
Generate the complete instrumented code for this ${this.language} function with SIMPLIFIED Handit.ai tracing.

IMPORTANT: We are using a SIMPLIFIED approach - only add tracing to the entry point function. Do NOT trace child functions.

FUNCTION DETAILS:
- Name: ${node.name}
- File: ${node.file}
- Line: ${node.line}
- Agent Name: ${this.agentName}
- Language: ${this.language}
- API Key: ${apiKey}
- Is FastAPI Endpoint: ${isFastAPIEndpoint}

ORIGINAL CODE:
\`\`\`${this.language}
${originalCode}
\`\`\`

SIMPLIFIED TRACING REQUIREMENTS:

${this.language === 'python' ? `
PYTHON APPROACH:
1. Import: from handit_ai import tracing, configure
2. Add configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY")) at the top
3. Add @tracing(agent="${this.agentName}") decorator to the entry point function
4. ${isFastAPIEndpoint ? 'For FastAPI endpoints, put the @tracing decorator BELOW the @app.post/@app.get decorator' : 'Add the decorator directly above the function definition'}
5. Do NOT modify child functions - leave them unchanged
6. Package to install: pip install handit_ai

${isFastAPIEndpoint ? `FastAPI Example:
\`\`\`python
from handit_ai import tracing, configure
import os

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

@app.post("/process")
@tracing(agent="${this.agentName}")
async def process_customer_request(user_message: str):
    # Your existing agent logic (unchanged)
    intent = await classify_intent(user_message)      # Not traced individually
    context = await search_knowledge(intent)          # Not traced individually  
    response = await generate_response(context)       # Not traced individually
    return response
\`\`\`
` : `Regular Function Example:
\`\`\`python
from handit_ai import tracing, configure
import os

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

@tracing(agent="${this.agentName}")
async def process_customer_request(user_message: str):
    # Your existing agent logic (unchanged)
    intent = await classify_intent(user_message)      # Not traced individually
    context = await search_knowledge(intent)          # Not traced individually  
    response = await generate_response(context)       # Not traced individually
    return response
\`\`\`
`}
` : `
JAVASCRIPT APPROACH:
1. Import: import { configure, startTracing, endTracing } from '@handit.ai/handit-ai'
2. Add configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY }) at the top
3. Wrap the entry point function with startTracing/endTracing calls
4. Use try/finally to ensure endTracing is always called
5. Do NOT modify child functions - leave them unchanged
6. Package to install: npm i @handit.ai/handit-ai

Example:
\`\`\`javascript
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

configure({
  HANDIT_API_KEY: process.env.HANDIT_API_KEY
});

export const processCustomerRequest = async (userMessage) => {
  startTracing({ agent: "${this.agentName}" });
  try {
    // Your existing agent logic (unchanged)
    const intent = await classifyIntent(userMessage);     // Not traced individually
    const context = await searchKnowledge(intent);       // Not traced individually
    const response = await generateResponse(context);     // Not traced individually
    return response;
  } finally {
    endTracing();
  }
};
\`\`\`
`}

CRITICAL RULES:
1. ONLY instrument the entry point function - do NOT add tracing to any child functions
2. Preserve ALL original function logic exactly
3. If Handit integration already exists, return requiredChanges: false
4. Make sure the code compiles and is valid
5. Add imports only if not already present

Return everything in the following json format:

{
    "code": "instrumented code",
    "requiredChanges": true/false
}
`;

    return basePrompt;
  }

  /**
   * Detect if the function is a FastAPI endpoint
   */
  async detectFastAPIEndpoint(node) {
    try {
      const filePath = path.resolve(node.file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.split('\n');
      
      // Check if the line before the function has FastAPI decorator
      const functionLineIndex = node.line - 1; // Convert to 0-based
      if (functionLineIndex > 0) {
        const previousLine = lines[functionLineIndex - 1];
        const decoratorMatch = previousLine.match(/^@(\w+)\.(post|get|put|delete|patch)\s*\(/);
        return !!decoratorMatch;
      }
      
      return false;
    } catch (error) {
      return false;
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

      // Get function definition and body
      const startLine = node.line - 1; // Convert to 0-based
      let endLine = startLine;

      if (this.language === 'python') {
        // Python: Use indentation-based logic
        endLine = this.findPythonFunctionEnd(lines, startLine);
      } else {
        // JavaScript/TypeScript: Use brace-based logic
        endLine = this.findJavaScriptFunctionEnd(lines, startLine);
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

  /**
   * Find the end of a Python function based on indentation
   */
  findPythonFunctionEnd(lines, startLine) {
    // Get the indentation level of the function definition
    const functionLine = lines[startLine];
    const functionIndentation = this.getIndentationLevel(functionLine);

    // Look for the next line with same or less indentation (excluding empty lines)
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineIndentation = this.getIndentationLevel(line);

      // Skip empty lines
      if (line.trim() === '') {
        continue;
      }

      // If we find a line with same or less indentation, we've reached the end
      if (
        !line.startsWith('def ') &&
        !line.startsWith('async def ') &&
        !line.startsWith(')') &&
        !line.startsWith('async ') &&
        !line.startsWith('class ') &&
        !line.startsWith('async class ')
      ) {
        if (lineIndentation <= functionIndentation) {
          return i - 1; // Return the line before this one
        }
      }
    }

    // If we reach the end of the file, return the last line
    return lines.length - 1;
  }

  /**
   * Find the end of a JavaScript/TypeScript function based on braces
   */
  findJavaScriptFunctionEnd(lines, startLine) {
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
        // Count braces to find function end
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && i > startLine) {
          return i;
        }
      }
    }

    return startLine; // If we can't find the end, return the start line
  }

  /**
   * Get the indentation level of a line (number of spaces/tabs)
   */
  getIndentationLevel(line) {
    const trimmed = line.trim();
    if (trimmed === '') {
      return 0; // Empty lines have no indentation
    }

    const leadingSpaces = line.length - line.trimStart().length;
    return leadingSpaces;
  }
}

module.exports = { CodeGenerator };
