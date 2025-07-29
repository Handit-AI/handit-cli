const fs = require('fs-extra');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * Node in the execution tree
 */
class ExecutionNode {
  constructor(name, file, line, type = 'function') {
    this.id = `${file}:${name}`;
    this.name = name;
    this.file = file;
    this.line = line;
    this.type = type;
    this.children = [];
    this.parent = null;
    this.metadata = {
      isAsync: false,
      isExported: false,
      parameters: [],
      returnType: null,
    };
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      file: this.file,
      line: this.line,
      type: this.type,
      children: this.children.map((child) => child.id),
      metadata: this.metadata,
    };
  }
}

/**
 * Create entry node with correct line number
 * @param {string} entryFunction - Name of entry function
 * @param {string} entryFile - Path to entry file
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<ExecutionNode>} - Entry node
 */
async function createEntryNode(entryFunction, entryFile, projectRoot) {
  try {
    const filePath = path.join(projectRoot, entryFile);
    const content = await fs.readFile(filePath, 'utf8');

    const functionDef = await findFunctionDefinition(
      entryFunction,
      content,
      entryFile
    );
    if (functionDef) {
      return new ExecutionNode(
        entryFunction,
        entryFile,
        functionDef.line,
        'endpoint'
      );
    }
  } catch (error) {
    console.warn(
      `Warning: Could not find entry function definition: ${error.message}`
    );
  }

  // Fallback to line 1 if not found
  return new ExecutionNode(entryFunction, entryFile, 1, 'endpoint');
}

/**
 * Build execution tree from entry function
 * @param {string} entryFile - Path to entry file
 * @param {string} entryFunction - Name of entry function
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} - Execution tree
 */
async function buildExecutionTree(entryFile, entryFunction, projectRoot) {
  try {
    const visited = new Set();
    const nodeMap = new Map();

    // Start with entry function - find the actual line number
    const entryNode = await createEntryNode(
      entryFunction,
      entryFile,
      projectRoot
    );

    nodeMap.set(entryNode.id, entryNode);

    // Build tree recursively
    await buildNodeTree(entryNode, projectRoot, visited, nodeMap);

    const result = {
      root: entryNode.id,
      nodes: Array.from(nodeMap.values()).map((node) => node.toJSON()),
      edges: buildEdges(nodeMap),
    };

    return result;
  } catch (error) {
    console.error(`Error building execution tree: ${error.message}`);
    console.error(`Error details: ${error.stack}`);
    throw error;
  }
}

/**
 * Build tree for a specific node
 * @param {ExecutionNode} node - Current node
 * @param {string} projectRoot - Project root
 * @param {Set} visited - Visited nodes
 * @param {Map} nodeMap - Node map
 */
async function buildNodeTree(node, projectRoot, visited, nodeMap) {
  if (visited.has(node.id)) {
    return; // Prevent cycles
  }

  visited.add(node.id);

  try {
    const filePath = path.join(projectRoot, node.file);
    const content = await fs.readFile(filePath, 'utf8');

    // Parse file based on extension
    const fileExt = path.extname(node.file);
    let functionCalls = [];

    if (
      fileExt === '.js' ||
      fileExt === '.ts' ||
      fileExt === '.jsx' ||
      fileExt === '.tsx'
    ) {
      functionCalls = await parseJavaScriptFile(content, node.name);
      // Add file information to each call
      functionCalls.forEach((call) => {
        call.file = node.file;
      });
      // console.log(`Found ${functionCalls.length} function calls in ${node.name}:`, functionCalls.map(c => c.name));
    } else if (fileExt === '.py') {
      functionCalls = await parsePythonFile(content, node.name);
      // Add file information to each call
      functionCalls.forEach((call) => {
        call.file = node.file;
      });
    }

    // Process each function call
    for (const call of functionCalls) {
      const childNode = await resolveFunctionCall(call, projectRoot, nodeMap);
      if (childNode) {
        node.addChild(childNode);
        await buildNodeTree(childNode, projectRoot, visited, nodeMap);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not analyze ${node.file}: ${error.message}`);
    console.warn(`Error details: ${error.stack}`);
  }
}

/**
 * Parse JavaScript/TypeScript file to find function calls
 * @param {string} content - File content
 * @param {string} functionName - Function to analyze
 * @returns {Array} - Array of function calls
 */
async function parseJavaScriptFile(content, functionName) {
  const functionCalls = [];

  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
    });

    let targetFunction = null;

    // Check if this is an Express route (contains hyphens or slashes)
    // Try Express route detection first
    traverse(ast, {
      CallExpression(path) {
        if (
          path.node.callee.type === 'MemberExpression' &&
          path.node.callee.object.name === 'app' &&
          (path.node.callee.property.name === 'post' ||
            path.node.callee.property.name === 'get' ||
            path.node.callee.property.name === 'put' ||
            path.node.callee.property.name === 'delete')
        ) {
          // Check if this is the route we're looking for
          const args = path.node.arguments;
          if (args.length >= 2) {
            const routePath = args[0];
            if (
              routePath.type === 'StringLiteral' &&
              (routePath.value === `/${functionName}` ||
                routePath.value === functionName)
            ) {
              // Found the route, the handler is the last argument
              const handler = args[args.length - 1];
              if (
                handler.type === 'FunctionExpression' ||
                handler.type === 'ArrowFunctionExpression'
              ) {
                // For Express routes, we need to find the path to the handler
                traverse(ast, {
                  FunctionExpression(handlerPath) {
                    if (handlerPath.node === handler) {
                      targetFunction = handlerPath;
                    }
                  },
                  ArrowFunctionExpression(handlerPath) {
                    if (handlerPath.node === handler) {
                      targetFunction = handlerPath;
                    }
                  },
                });
                // console.log(`Found Express route handler for ${functionName} at line ${path.node.loc?.start.line}`);
              }
            }
          }
        }
      },
    });

    // If Express route not found, try regular function detection
    if (!targetFunction) {
      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name === functionName) {
            targetFunction = path;
          }
        },
        VariableDeclarator(path) {
          if (
            path.node.id &&
            path.node.id.name === functionName &&
            path.node.init &&
            path.node.init.type === 'FunctionExpression'
          ) {
            targetFunction = path.node.init;
          }
        },
        FunctionExpression(path) {
          // Handle arrow functions and other function expressions
          if (
            path.parent &&
            path.parent.id &&
            path.parent.id.name === functionName
          ) {
            targetFunction = path;
          }
        },
      });
    }

    if (!targetFunction) {
      console.warn(`Function/Route "${functionName}" not found in file`);
      return functionCalls;
    }

    // console.log(`Target function found, searching for calls within it...`);

    // Find function calls within the target function
    // We need to traverse the entire AST and check if we're within the target function
    traverse(ast, {
      CallExpression(path) {
        // Check if this call is within our target function
        let currentPath = path;
        let inTargetFunction = false;

        while (currentPath.parentPath) {
          if (currentPath.node === targetFunction.node) {
            inTargetFunction = true;
            break;
          }
          currentPath = currentPath.parentPath;
        }

        if (inTargetFunction) {
          const callee = path.node.callee;

          if (callee.type === 'Identifier') {
            functionCalls.push({
              name: callee.name,
              line: path.node.loc?.start.line || 0,
              type: 'function',
            });
          } else if (callee.type === 'MemberExpression') {
            // Handle method calls like obj.method()
            if (callee.property && callee.property.type === 'Identifier') {
              functionCalls.push({
                name: callee.property.name,
                line: path.node.loc?.start.line || 0,
                type: 'method',
                object: callee.object.name,
              });
            }
          }
        }
      },
    });
  } catch (error) {
    console.warn(`Warning: Could not parse JavaScript file: ${error.message}`);
    console.warn(`Error details: ${error.stack}`);
  }

  return functionCalls;
}

/**
 * Parse Python file to find function calls
 * @param {string} content - File content
 * @param {string} functionName - Function to analyze
 * @returns {Array} - Array of function calls
 */
async function parsePythonFile(content, functionName) {
  console.log('content', content);
  console.log('functionName', functionName);
  const functionCalls = [];
  const lines = content.split('\n');

  try {
    let inTargetFunction = false;
    let functionIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      // Find function definition
      if (
        trimmedLine.startsWith('def ') ||
        trimmedLine.startsWith('async def ') ||
        trimmedLine.startsWith('@app')
      ) {
        const defMatch = trimmedLine.match(/^(?:async\s+)?def\s+(\w+)/);
        if (defMatch && defMatch[1] === functionName) {
          inTargetFunction = true;
          functionIndent = line.length - line.trimStart().length;
          continue;
        }

        const decoratorMatch = trimmedLine.match(
          /^@(\w+)\.(post|get|put|delete|patch)\s*\(\s*["']([^"']+)["']/
        );

        if (
          decoratorMatch &&
          (decoratorMatch[3] == functionName ||
            decoratorMatch[3] == functionName.replace('_', '-') ||
            decoratorMatch[3] == functionName.replace('-', '_') ||
            decoratorMatch[3] == '/' + functionName.replace('_', '-') ||
            decoratorMatch[3] == '/' + functionName.replace('-', '_') ||
            '/' + decoratorMatch[3] == functionName ||
            '/' + decoratorMatch[3] == functionName.replace('_', '-') ||
            '/' + decoratorMatch[3] == functionName.replace('-', '_'))
        ) {
          inTargetFunction = true;
          functionIndent = line.length - line.trimStart().length;
          continue;
        }
      }

      // If we're in the target function, look for function calls
      if (inTargetFunction) {
        const currentIndent = line.length - line.trimStart().length;
        // Check if we've left the function
        if (
          !trimmedLine.startsWith('def ') &&
          !trimmedLine.startsWith('async def ') &&
          !trimmedLine.startsWith('@app') &&
          !trimmedLine.startsWith('(') &&
          !trimmedLine.startsWith(')') &&
          !trimmedLine.startsWith('*') &&
          !trimmedLine.startsWith('**') &&
          !trimmedLine.startsWith('"""') &&
          !trimmedLine.startsWith("'''")
        ) {
          if (currentIndent <= functionIndent) {
            inTargetFunction = false;
            break;
          }

          // Pattern 2: Method calls like object.method()
          const methodMatch = trimmedLine.match(/(\w+)\.(\w+)\s*\(/);
          if (methodMatch) {
            const objectName = methodMatch[1];
            const methodName = methodMatch[2];
            // Skip common object methods that we don't want to track
            const skipObjects = ['file', 'result', 'logger'];
            const skipMethods = [
              'read',
              'startswith',
              'split',
              'strip',
              'join',
              'append',
              'extend',
              'pop',
              'get',
              'set',
              'keys',
              'values',
              'items',
              'update',
              'copy',
              'clear',
            ];

            if (
              !skipObjects.includes(objectName) &&
              !skipMethods.includes(methodName)
            ) {
              console.log('methodMatch', methodMatch);
              console.log('entroooooo')
              functionCalls.push({
                name: `${objectName}.${methodName}`,
                line: i + 1,
                type: 'method',
              });
              continue;
            }
          }

          // Look for function calls - handle multiple patterns
          // Pattern 1: Simple function calls like function_name()
          let callMatch = trimmedLine.match(/(\w+)\s*\(/);
          if (callMatch) {
            const callName = callMatch[1];
            // Skip built-in functions and common keywords
            const skipList = [
              'print',
              'len',
              'str',
              'int',
              'float',
              'list',
              'dict',
              'set',
              'if',
              'for',
              'while',
              'try',
              'except',
              'finally',
              'with',
              'as',
              'import',
              'from',
              'return',
              'yield',
              'await',
              'raise',
              'HTTPException',
              'logger',
              'File',
              'Form',
              'image',
              'email',
              'startswith',
              'file',
              'read',
              'info',
              'error',
            ];

            if (!skipList.includes(callName)) {
              functionCalls.push({
                name: callName,
                line: i + 1,
                type: 'function',
              });
            }
          }

          

          // Pattern 3: await function calls like await function_name()
          const awaitMatch = trimmedLine.match(/await\s+(\w+)\s*\(/);
          if (awaitMatch) {
            const callName = awaitMatch[1];
            const skipList = ['file.read', 'result.success', 'result.message'];

            if (!skipList.includes(callName)) {
              functionCalls.push({
                name: callName,
                line: i + 1,
                type: 'async_function',
              });
            }
          }

          // Pattern 4: await method calls like await object.method()
          const awaitMethodMatch = trimmedLine.match(
            /await\s+(\w+)\.(\w+)\s*\(/
          );
          if (awaitMethodMatch) {
            const objectName = awaitMethodMatch[1];
            const methodName = awaitMethodMatch[2];
            const skipObjects = ['file', 'result'];
            const skipMethods = ['read'];

            if (
              !skipObjects.includes(objectName) &&
              !skipMethods.includes(methodName)
            ) {
              functionCalls.push({
                name: `${objectName}.${methodName}`,
                line: i + 1,
                type: 'async_method',
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not parse Python file: ${error.message}`);
  }
  console.log('functionCalls', functionCalls);
  return functionCalls;
}

/**
 * Resolve a function call to find its definition
 * @param {Object} call - Function call info
 * @param {string} projectRoot - Project root
 * @param {Map} nodeMap - Node map
 * @returns {Promise<ExecutionNode|null>} - Resolved node or null
 */
async function resolveFunctionCall(call, projectRoot, nodeMap) {
  // Handle method calls (e.g., "processor.process_document")
  let searchName = call.name;
  let isMethodCall = false;

  if (call.name.includes('.')) {
    const parts = call.name.split('.');
    searchName = parts[1]; // Use the method name for searching
    isMethodCall = true;
  }

  // First, try to find in the same file
  const sameFileCalls = Array.from(nodeMap.values()).filter(
    (node) => node.name === call.name && node.file === call.file
  );

  if (sameFileCalls.length > 0) {
    return sameFileCalls[0];
  }

  // Search in the same file first (for functions defined in the same file)
  const currentFile = call.file || 'server.py';
  try {
    const filePath = path.join(projectRoot, currentFile);
    const content = await fs.readFile(filePath, 'utf8');

    // For method calls, search for the method name in the file
    const functionDef = await findFunctionDefinition(
      searchName,
      content,
      currentFile
    );
    if (functionDef) {
      const nodeId = `${currentFile}:${call.name}`;

      if (nodeMap.has(nodeId)) {
        return nodeMap.get(nodeId);
      }

      const newNode = new ExecutionNode(
        call.name,
        currentFile,
        functionDef.line,
        call.type
      );
      newNode.metadata = functionDef.metadata;
      nodeMap.set(nodeId, newNode);
      return newNode;
    }
  } catch (error) {
    // Continue searching other files
  }

  // Search in other files
  const allFiles = await getAllFiles(projectRoot);

  for (const file of allFiles) {
    if (file === currentFile) continue; // Already checked

    try {
      const filePath = path.join(projectRoot, file);
      const content = await fs.readFile(filePath, 'utf8');

      const functionDef = await findFunctionDefinition(
        searchName,
        content,
        file
      );
      if (functionDef) {
        const nodeId = `${file}:${call.name}`;

        if (nodeMap.has(nodeId)) {
          return nodeMap.get(nodeId);
        }

        const newNode = new ExecutionNode(
          call.name,
          file,
          functionDef.line,
          call.type
        );
        newNode.metadata = functionDef.metadata;
        nodeMap.set(nodeId, newNode);
        return newNode;
      }
    } catch (error) {
      // Continue searching other files
    }
  }

  return null;
}

/**
 * Find function definition in file content
 * @param {string} functionName - Function name to find
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Promise<Object|null>} - Function definition or null
 */
async function findFunctionDefinition(functionName, content, filePath) {
  const fileExt = path.extname(filePath);

  if (
    fileExt === '.js' ||
    fileExt === '.ts' ||
    fileExt === '.jsx' ||
    fileExt === '.tsx'
  ) {
    return findJavaScriptFunction(functionName, content);
  } else if (fileExt === '.py') {
    return findPythonFunction(functionName, content);
  }

  return null;
}

/**
 * Find JavaScript function definition
 * @param {string} functionName - Function name
 * @param {string} content - File content
 * @returns {Object|null} - Function definition
 */
function findJavaScriptFunction(functionName, content) {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true,
    });

    let result = null;

    // Check if this is an Express route (contains hyphens or slashes)
    const isExpressRoute =
      functionName.includes('-') || functionName.includes('/');

    if (isExpressRoute) {
      // Find Express route handler
      traverse(ast, {
        CallExpression(path) {
          if (
            path.node.callee.type === 'MemberExpression' &&
            path.node.callee.object.name === 'app' &&
            (path.node.callee.property.name === 'post' ||
              path.node.callee.property.name === 'get' ||
              path.node.callee.property.name === 'put' ||
              path.node.callee.property.name === 'delete')
          ) {
            // Check if this is the route we're looking for
            const args = path.node.arguments;
            if (args.length >= 2) {
              const routePath = args[0];
              if (
                routePath.type === 'StringLiteral' &&
                routePath.value === `/${functionName}`
              ) {
                // Found the route, the handler is the last argument
                const handler = args[args.length - 1];
                if (
                  handler.type === 'FunctionExpression' ||
                  handler.type === 'ArrowFunctionExpression'
                ) {
                  result = {
                    line: path.node.loc?.start.line || 0,
                    metadata: {
                      isAsync: handler.async,
                      isExported: false,
                      parameters: handler.params.map((param) => param.name),
                      returnType: null,
                    },
                  };
                }
              }
            }
          }
        },
      });
    } else {
      // Find regular function
      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name === functionName) {
            result = {
              line: path.node.loc?.start.line || 0,
              metadata: {
                isAsync: path.node.async,
                isExported:
                  path.parent.type === 'ExportNamedDeclaration' ||
                  path.parent.type === 'ExportDefaultDeclaration',
                parameters: path.node.params.map((param) => param.name),
                returnType: null,
              },
            };
          }
        },
        VariableDeclarator(path) {
          if (
            path.node.id &&
            path.node.id.name === functionName &&
            path.node.init &&
            path.node.init.type === 'FunctionExpression'
          ) {
            result = {
              line: path.node.loc?.start.line || 0,
              metadata: {
                isAsync: path.node.init.async,
                isExported:
                  path.parent.parent.type === 'ExportNamedDeclaration',
                parameters: path.node.init.params.map((param) => param.name),
                returnType: null,
              },
            };
          }
        },
      });
    }

    return result;
  } catch (error) {
    console.warn(
      `Warning: Could not find JavaScript function "${functionName}": ${error.message}`
    );
    return null;
  }
}

/**
 * Find Python function definition
 * @param {string} functionName - Function name
 * @param {string} content - File content
 * @returns {Object|null} - Function definition
 */
function findPythonFunction(functionName, content) {
  const lines = content.split('\n');
  console.log(`Searching for Python function: ${functionName}`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle FastAPI decorators - look for @app.post, @app.get, etc.
    // Support both @app.post("/path") and @app.post("/path", response_model=...)
    const decoratorMatch = line.match(
      /^@(\w+)\.(post|get|put|delete|patch)\s*\(/
    );
    if (decoratorMatch) {
      // Check if the next line contains the function definition
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const defMatch = nextLine.match(/^(?:async\s+)?def\s+(\w+)/);

        if (defMatch && defMatch[1] === functionName) {
          console.log(
            `Found FastAPI endpoint: ${functionName} at line ${i + 2}`
          );
          // Extract parameters from the function definition
          const paramMatch = nextLine.match(/\(([^)]*)\)/);
          const parameters = paramMatch
            ? paramMatch[1]
                .split(',')
                .map((p) => p.trim())
                .filter((p) => p)
            : [];

          return {
            line: i + 2, // Function definition is on the next line
            metadata: {
              isAsync: nextLine.includes('async def'),
              isExported: true, // FastAPI endpoints are exported
              parameters: parameters,
              returnType: null,
              isEndpoint: true,
            },
          };
        }
      }
    }

    // Handle class method definitions (for method calls like processor.process_document)
    const classMethodMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
    if (classMethodMatch && classMethodMatch[1] === functionName) {
      console.log(`Found class method: ${functionName} at line ${i + 1}`);
      // Extract parameters
      const paramMatch = line.match(/\(([^)]*)\)/);
      const parameters = paramMatch
        ? paramMatch[1]
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p)
        : [];

      return {
        line: i + 1,
        metadata: {
          isAsync: line.includes('async def'),
          isExported: false,
          parameters: parameters,
          returnType: null,
          isMethod: true,
        },
      };
    }

    // Handle regular function definitions
    const defMatch = line.match(/^(?:async\s+)?def\s+(\w+)/);
    if (defMatch && defMatch[1] === functionName) {
      console.log(`Found regular function: ${functionName} at line ${i + 1}`);
      // Extract parameters
      const paramMatch = line.match(/\(([^)]*)\)/);
      const parameters = paramMatch
        ? paramMatch[1]
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p)
        : [];

      return {
        line: i + 1,
        metadata: {
          isAsync: line.includes('async def'),
          isExported: false, // Python doesn't have explicit exports like JS
          parameters: parameters,
          returnType: null,
        },
      };
    }
  }

  return null;
}

/**
 * Get all files in project
 * @param {string} projectRoot - Project root
 * @returns {Promise<Array>} - Array of file paths
 */
async function getAllFiles(projectRoot) {
  const { glob } = require('glob');
  const patterns = ['**/*.js', '**/*.ts', '**/*.py', '**/*.jsx', '**/*.tsx'];

  const files = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectRoot,
      ignore: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        '__pycache__/**',
        '*.pyc',
        '.env*',
        'package-lock.json',
        'yarn.lock',
      ],
    });
    files.push(...matches);
  }

  return files.sort();
}

/**
 * Build edges from node map
 * @param {Map} nodeMap - Node map
 * @returns {Array} - Array of edges
 */
function buildEdges(nodeMap) {
  const edges = [];

  for (const node of nodeMap.values()) {
    for (const child of node.children) {
      edges.push({
        from: node.id,
        to: child.id,
      });
    }
  }

  return edges;
}

module.exports = {
  buildExecutionTree,
  ExecutionNode,
};
