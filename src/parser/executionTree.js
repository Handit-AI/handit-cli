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
      returnType: null
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
      children: this.children.map(child => child.id),
      metadata: this.metadata
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
    
    const functionDef = await findFunctionDefinition(entryFunction, content, entryFile);
    if (functionDef) {
      return new ExecutionNode(entryFunction, entryFile, functionDef.line, 'endpoint');
    }
  } catch (error) {
    console.warn(`Warning: Could not find entry function definition: ${error.message}`);
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
  const entryNode = await createEntryNode(entryFunction, entryFile, projectRoot);
  nodeMap.set(entryNode.id, entryNode);
    
    // Build tree recursively
    await buildNodeTree(entryNode, projectRoot, visited, nodeMap);
    
    const result = {
      root: entryNode.id,
      nodes: Array.from(nodeMap.values()).map(node => node.toJSON()),
      edges: buildEdges(nodeMap)
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
    
    if (fileExt === '.js' || fileExt === '.ts' || fileExt === '.jsx' || fileExt === '.tsx') {
      functionCalls = await parseJavaScriptFile(content, node.name);
      // Add file information to each call
      functionCalls.forEach(call => {
        call.file = node.file;
      });
      // console.log(`Found ${functionCalls.length} function calls in ${node.name}:`, functionCalls.map(c => c.name));
    } else if (fileExt === '.py') {
      functionCalls = await parsePythonFile(content, node.name);
      // Add file information to each call
      functionCalls.forEach(call => {
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
      errorRecovery: true
    });
    
    let targetFunction = null;
    
    // Check if this is an Express route (contains hyphens or slashes)
    const isExpressRoute = functionName.includes('-') || functionName.includes('/');
    
    if (isExpressRoute) {
      // Find Express route handler
      traverse(ast, {
        CallExpression(path) {
          if (path.node.callee.type === 'MemberExpression' &&
              path.node.callee.object.name === 'app' &&
              (path.node.callee.property.name === 'post' || 
               path.node.callee.property.name === 'get' ||
               path.node.callee.property.name === 'put' ||
               path.node.callee.property.name === 'delete')) {
            
            // Check if this is the route we're looking for
            const args = path.node.arguments;
            if (args.length >= 2) {
              const routePath = args[0];
              if (routePath.type === 'StringLiteral' && 
                  routePath.value === `/${functionName}`) {
                // Found the route, the handler is the last argument
                const handler = args[args.length - 1];
                if (handler.type === 'FunctionExpression' || 
                    handler.type === 'ArrowFunctionExpression') {
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
                    }
                  });
                  // console.log(`Found Express route handler for ${functionName} at line ${path.node.loc?.start.line}`);
                }
              }
            }
          }
        }
      });
    } else {
      // Find regular function
      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id && path.node.id.name === functionName) {
            targetFunction = path;
          }
        },
        VariableDeclarator(path) {
          if (path.node.id && path.node.id.name === functionName && 
              path.node.init && 
              path.node.init.type === 'FunctionExpression') {
            targetFunction = path.node.init;
          }
        },
        FunctionExpression(path) {
          // Handle arrow functions and other function expressions
          if (path.parent && path.parent.id && path.parent.id.name === functionName) {
            targetFunction = path;
          }
        }
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
              type: 'function'
            });
          } else if (callee.type === 'MemberExpression') {
            // Handle method calls like obj.method()
            if (callee.property && callee.property.type === 'Identifier') {
              functionCalls.push({
                name: callee.property.name,
                line: path.node.loc?.start.line || 0,
                type: 'method',
                object: callee.object.name
              });
            }
          }
        }
      }
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
  const functionCalls = [];
  const lines = content.split('\n');
  
  try {
    let inTargetFunction = false;
    let functionIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Find function definition
      if (trimmedLine.startsWith('def ') || trimmedLine.startsWith('async def ')) {
        const defMatch = trimmedLine.match(/^(?:async\s+)?def\s+(\w+)/);
        if (defMatch && defMatch[1] === functionName) {
          inTargetFunction = true;
          functionIndent = line.length - line.trimStart().length;
          continue;
        }
      }
      
      // If we're in the target function, look for function calls
      if (inTargetFunction) {
        const currentIndent = line.length - line.trimStart().length;
        
        // Check if we've left the function
        if (trimmedLine && currentIndent <= functionIndent) {
          inTargetFunction = false;
          break;
        }
        
        // Look for function calls
        const callMatch = trimmedLine.match(/(\w+)\s*\(/);
        if (callMatch) {
          const callName = callMatch[1];
          // Skip built-in functions and common keywords
          const skipList = ['print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'if', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'await'];
          
          if (!skipList.includes(callName)) {
            functionCalls.push({
              name: callName,
              line: i + 1,
              type: 'function'
            });
          }
        }
      }
    }
    
  } catch (error) {
    console.warn(`Warning: Could not parse Python file: ${error.message}`);
  }
  
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
  // First, try to find in the same file
  const sameFileCalls = Array.from(nodeMap.values()).filter(node => 
    node.name === call.name && node.file === call.file
  );
  
  if (sameFileCalls.length > 0) {
    return sameFileCalls[0];
  }
  
  // Search in the same file first (for functions defined in the same file)
  const currentFile = call.file || 'server.js';
  try {
    const filePath = path.join(projectRoot, currentFile);
    const content = await fs.readFile(filePath, 'utf8');
    
    const functionDef = await findFunctionDefinition(call.name, content, currentFile);
    if (functionDef) {
      const nodeId = `${currentFile}:${call.name}`;
      
      if (nodeMap.has(nodeId)) {
        return nodeMap.get(nodeId);
      }
      
      const newNode = new ExecutionNode(call.name, currentFile, functionDef.line, call.type);
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
      
      const functionDef = await findFunctionDefinition(call.name, content, file);
      if (functionDef) {
        const nodeId = `${file}:${call.name}`;
        
        if (nodeMap.has(nodeId)) {
          return nodeMap.get(nodeId);
        }
        
        const newNode = new ExecutionNode(call.name, file, functionDef.line, call.type);
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
  
  if (fileExt === '.js' || fileExt === '.ts' || fileExt === '.jsx' || fileExt === '.tsx') {
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
      errorRecovery: true
    });
    
    let result = null;
    
    // Check if this is an Express route (contains hyphens or slashes)
    const isExpressRoute = functionName.includes('-') || functionName.includes('/');
    
    if (isExpressRoute) {
      // Find Express route handler
      traverse(ast, {
        CallExpression(path) {
          if (path.node.callee.type === 'MemberExpression' &&
              path.node.callee.object.name === 'app' &&
              (path.node.callee.property.name === 'post' || 
               path.node.callee.property.name === 'get' ||
               path.node.callee.property.name === 'put' ||
               path.node.callee.property.name === 'delete')) {
            
            // Check if this is the route we're looking for
            const args = path.node.arguments;
            if (args.length >= 2) {
              const routePath = args[0];
              if (routePath.type === 'StringLiteral' && 
                  routePath.value === `/${functionName}`) {
                // Found the route, the handler is the last argument
                const handler = args[args.length - 1];
                if (handler.type === 'FunctionExpression' || 
                    handler.type === 'ArrowFunctionExpression') {
                  result = {
                    line: path.node.loc?.start.line || 0,
                    metadata: {
                      isAsync: handler.async,
                      isExported: false,
                      parameters: handler.params.map(param => param.name),
                      returnType: null
                    }
                  };
                }
              }
            }
          }
        }
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
                isExported: path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration',
                parameters: path.node.params.map(param => param.name),
                returnType: null
              }
            };
          }
        },
        VariableDeclarator(path) {
          if (path.node.id && path.node.id.name === functionName && 
              path.node.init && 
              path.node.init.type === 'FunctionExpression') {
            result = {
              line: path.node.loc?.start.line || 0,
              metadata: {
                isAsync: path.node.init.async,
                isExported: path.parent.parent.type === 'ExportNamedDeclaration',
                parameters: path.node.init.params.map(param => param.name),
                returnType: null
              }
            };
          }
        }
      });
    }
    
    return result;
  } catch (error) {
    console.warn(`Warning: Could not find JavaScript function "${functionName}": ${error.message}`);
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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const defMatch = line.match(/^(?:async\s+)?def\s+(\w+)/);
    
    if (defMatch && defMatch[1] === functionName) {
      // Extract parameters
      const paramMatch = line.match(/\(([^)]*)\)/);
      const parameters = paramMatch ? 
        paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
      
      return {
        line: i + 1,
        metadata: {
          isAsync: line.includes('async def'),
          isExported: false, // Python doesn't have explicit exports like JS
          parameters: parameters,
          returnType: null
        }
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
  const patterns = [
    '**/*.js',
    '**/*.ts',
    '**/*.py',
    '**/*.jsx',
    '**/*.tsx'
  ];
  
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
        'yarn.lock'
      ]
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
        to: child.id
      });
    }
  }
  
  return edges;
}

module.exports = {
  buildExecutionTree,
  ExecutionNode
}; 