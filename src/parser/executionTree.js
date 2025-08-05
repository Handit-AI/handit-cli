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
 * Parse Python file to find function calls using AST
 * @param {string} content - File content
 * @param {string} functionName - Function to analyze
 * @returns {Array} - Array of function calls
 */
async function parsePythonFile(content, functionName) {
  // Extract just the function name from method calls like "processor.process_document"
  const targetFunctionName = functionName.includes('.')
    ? functionName.split('.')[1]
    : functionName;

  const functionCalls = [];

  try {
    // Use Python's built-in ast module to parse the code
    const { spawn } = require('child_process');

    // Create a Python script to parse the AST
    const pythonScript = `
import ast
import json
import sys

def find_function_calls_and_definitions(code, target_function):
    try:
        tree = ast.parse(code)
        calls = []
        definitions = []
        
        class FunctionVisitor(ast.NodeVisitor):
            def __init__(self):
                self.calls = []
                self.definitions = []
                self.in_target_function = False
                self.current_function = None
            
            def visit_FunctionDef(self, node):
                # Check if this is our target function
                if node.name == target_function:
                    self.in_target_function = True
                    self.current_function = node.name
                
                # Visit all nodes in this function
                self.generic_visit(node)
                
                # If we were in the target function, we're done
                if self.current_function == target_function:
                    self.in_target_function = False
                    self.current_function = None
            
            def visit_AsyncFunctionDef(self, node):
                # Same as FunctionDef but for async functions
                if node.name == target_function:
                    self.in_target_function = True
                    self.current_function = node.name
                
                self.generic_visit(node)
                
                if self.current_function == target_function:
                    self.in_target_function = False
                    self.current_function = None
            
            def visit_Call(self, node):
                if self.in_target_function:
                    call_info = {}
                    
                    if isinstance(node.func, ast.Name):
                        # Simple function call: function_name()
                        call_info = {
                            'name': node.func.id,
                            'line': node.lineno,
                            'type': 'function'
                        }
                    elif isinstance(node.func, ast.Attribute):
                        # Method call: object.method()
                        call_info = {
                            'name': f"{self._get_attribute_name(node.func)}.{node.func.attr}",
                            'line': node.lineno,
                            'type': 'method'
                        }
                    
                    # Skip built-in functions and common keywords
                    skip_list = [
                        'print', 'len', 'str', 'int', 'float', 'list', 'dict', 'set',
                        'if', 'for', 'while', 'try', 'except', 'finally', 'with', 'as',
                        'import', 'from', 'return', 'yield', 'await', 'raise',
                        'HTTPException', 'logger', 'File', 'Form', 'image', 'email',
                        'startswith', 'file', 'read', 'info', 'error'
                    ]
                    
                    skip_objects = ['file', 'result', 'logger']
                    skip_methods = ['read', 'startswith', 'split', 'strip', 'join', 'append', 'extend', 'pop', 'get', 'set', 'keys', 'values', 'items', 'update', 'copy', 'clear']
                    
                    if call_info.get('name'):
                        if 'type' in call_info and call_info['type'] == 'function':
                            if call_info['name'] not in skip_list:
                                self.calls.append(call_info)
                        elif 'type' in call_info and call_info['type'] == 'method':
                            parts = call_info['name'].split('.')
                            if len(parts) == 2:
                                obj_name, method_name = parts
                                if obj_name not in skip_objects and method_name not in skip_methods:
                                    self.calls.append(call_info)
                
                self.generic_visit(node)
            
            def visit_Assign(self, node):
                # Find variable assignments like "processor = DocumentProcessor()"
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if isinstance(node.value, ast.Call) and isinstance(node.value.func, ast.Name):
                            assignment_info = {
                                'variable': target.id,
                                'class': node.value.func.id,
                                'line': node.lineno,
                                'type': 'assignment'
                            }
                            self.definitions.append(assignment_info)
                
                self.generic_visit(node)
            
            def visit_ImportFrom(self, node):
                # Find imports like "from document_processor import DocumentProcessor"
                for alias in node.names:
                    import_info = {
                        'module': node.module,
                        'name': alias.name,
                        'asname': alias.asname,
                        'line': node.lineno,
                        'type': 'import'
                    }
                    self.definitions.append(import_info)
                
                self.generic_visit(node)
            
            def _get_attribute_name(self, node):
                """Get the full attribute name (e.g., 'processor.process_document')"""
                if isinstance(node.value, ast.Name):
                    return node.value.id
                elif isinstance(node.value, ast.Attribute):
                    return f"{self._get_attribute_name(node.value)}.{node.value.attr}"
                else:
                    return "unknown"
        
        visitor = FunctionVisitor()
        visitor.visit(tree)
        
        
        return {
            'calls': visitor.calls,
            'definitions': visitor.definitions
        }
        
    except Exception as e:
        return {'calls': [], 'definitions': []}

# Read input from stdin
code = sys.stdin.read()
target_function = sys.argv[1] if len(sys.argv) > 1 else ''

result = find_function_calls_and_definitions(code, target_function)
print(json.dumps(result))
`;

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [
        '-c',
        pythonScript,
        targetFunctionName,
      ]);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);

            // Use the definitions to resolve function calls
            const resolvedCalls = [];

            for (const call of result.calls) {
              if (call.type === 'method') {
                // For method calls, try to resolve using definitions
                const parts = call.name.split('.');
                const objectName = parts[0];
                const methodName = parts[1];

                // Find the object definition
                const objectDef = result.definitions.find(
                  (def) =>
                    def.type === 'assignment' && def.variable === objectName
                );

                if (objectDef) {
                  // Find the class import
                  const classImport = result.definitions.find(
                    (def) =>
                      def.type === 'import' && def.name === objectDef.class
                  );

                  if (classImport) {
                    // Add the module information to the call
                    call.module = classImport.module;
                    call.className = objectDef.class;
                  }
                }
              }

              resolvedCalls.push(call);
            }

            resolve(resolvedCalls);
          } catch (error) {
            console.warn('Error parsing Python AST output:', error);
            resolve([]);
          }
        } else {
          console.warn('Python AST parsing failed:', stderr);
          resolve([]);
        }
      });

      pythonProcess.stdin.write(content);
      pythonProcess.stdin.end();
    });
  } catch (error) {
    console.warn(`Warning: Could not parse Python file: ${error.message}`);
    return [];
  }
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
  let objectName = null;

  if (call.name.includes('.')) {
    const parts = call.name.split('.');
    objectName = parts[0];
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

    // For method calls, try to find the object definition first
    if (isMethodCall && objectName) {
      // If the call has module information from AST, use it directly
      if (call.module) {
        const importedFile = await findImportedFile(call.module, projectRoot);
        if (importedFile) {
          const importedContent = await fs.readFile(
            path.join(projectRoot, importedFile),
            'utf8'
          );
          const functionDef = await findFunctionDefinition(
            searchName,
            importedContent,
            importedFile
          );
          if (functionDef) {
            const nodeId = `${importedFile}:${call.name}`;
            if (nodeMap.has(nodeId)) {
              return nodeMap.get(nodeId);
            }
            const newNode = new ExecutionNode(
              call.name,
              importedFile,
              functionDef.line,
              call.type
            );
            newNode.metadata = functionDef.metadata;
            nodeMap.set(nodeId, newNode);
            return newNode;
          }
        }
      }

      // Fallback to the old method if no module info from AST
      const objectDef = await findObjectDefinition(
        objectName,
        content,
        currentFile
      );
      if (objectDef) {
        // If it's an import, search in the imported file
        if (objectDef.type === 'import' && objectDef.module) {
          const importedFile = await findImportedFile(
            objectDef.module,
            projectRoot
          );
          if (importedFile) {
            const importedContent = await fs.readFile(
              path.join(projectRoot, importedFile),
              'utf8'
            );
            const functionDef = await findFunctionDefinition(
              searchName,
              importedContent,
              importedFile
            );
            if (functionDef) {
              const nodeId = `${importedFile}:${call.name}`;
              if (nodeMap.has(nodeId)) {
                return nodeMap.get(nodeId);
              }
              const newNode = new ExecutionNode(
                call.name,
                importedFile,
                functionDef.line,
                call.type
              );
              newNode.metadata = functionDef.metadata;
              nodeMap.set(nodeId, newNode);
              return newNode;
            }
          }
        }
        // If it's an assignment, search for the class definition
        else if (objectDef.type === 'assignment' && objectDef.className) {
          // First, try to find the class import
          const classImport = await findObjectDefinition(
            objectDef.className,
            content,
            currentFile
          );
          if (
            classImport &&
            classImport.type === 'import' &&
            classImport.module
          ) {
            const importedFile = await findImportedFile(
              classImport.module,
              projectRoot
            );
            if (importedFile) {
              const importedContent = await fs.readFile(
                path.join(projectRoot, importedFile),
                'utf8'
              );
              const functionDef = await findFunctionDefinition(
                searchName,
                importedContent,
                importedFile
              );
              if (functionDef) {
                const nodeId = `${importedFile}:${call.name}`;
                if (nodeMap.has(nodeId)) {
                  return nodeMap.get(nodeId);
                }
                const newNode = new ExecutionNode(
                  call.name,
                  importedFile,
                  functionDef.line,
                  call.type
                );
                newNode.metadata = functionDef.metadata;
                return newNode;
              }
            }
          }
        }
      } else {
        // No object definition found, continue with other search methods
      }
    }

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
    console.warn(`Error searching in same file: ${error.message}`);
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
 * Find object definition (import, class, etc.)
 * @param {string} objectName - Object name to find
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {Promise<Object|null>} - Object definition or null
 */
async function findObjectDefinition(objectName, content, filePath) {
  const fileExt = path.extname(filePath);

  if (fileExt === '.py') {
    return findPythonObject(objectName, content);
  }

  return null;
}

/**
 * Find Python object definition
 * @param {string} objectName - Object name
 * @param {string} content - File content
 * @returns {Object|null} - Object definition
 */
function findPythonObject(objectName, content) {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for imports
    const importMatch = line.match(/^from\s+(\S+)\s+import\s+(\w+)/);
    if (importMatch) {
      const module = importMatch[1];
      const importedName = importMatch[2];
      if (importedName === objectName) {
        return {
          type: 'import',
          module: module,
          line: i + 1,
        };
      }
    }

    // Check for direct imports
    const directImportMatch = line.match(/^import\s+(\w+)/);
    if (directImportMatch) {
      const module = directImportMatch[1];
      if (module === objectName) {
        return {
          type: 'import',
          module: module,
          line: i + 1,
        };
      }
    }

    // Check for class definitions
    const classMatch = line.match(/^class\s+(\w+)/);
    if (classMatch && classMatch[1] === objectName) {
      return {
        type: 'class',
        line: i + 1,
      };
    }

    // Check for variable assignments like "processor = DocumentProcessor()"
    const assignmentMatch = line.match(/^(\w+)\s*=\s*(\w+)\s*\(/);
    if (assignmentMatch) {
      const varName = assignmentMatch[1];
      const className = assignmentMatch[2];
      if (varName === objectName) {
        return {
          type: 'assignment',
          className: className,
          line: i + 1,
        };
      }
    }
  }

  return null;
}

/**
 * Find imported file based on module name
 * @param {string} moduleName - Module name
 * @param {string} projectRoot - Project root
 * @returns {Promise<string|null>} - File path or null
 */
async function findImportedFile(moduleName, projectRoot) {
  // Common Python file extensions
  const extensions = ['.py', '.pyx', '.pyi'];

  for (const ext of extensions) {
    const possibleFiles = [
      `${moduleName}${ext}`,
      `${moduleName}/__init__${ext}`,
      `${moduleName.replace(/\./g, '/')}${ext}`,
      `${moduleName.replace(/\./g, '/')}/__init__${ext}`,
    ];

    for (const file of possibleFiles) {
      const filePath = path.join(projectRoot, file);
      try {
        await fs.access(filePath);
        return file;
      } catch (error) {
        // File doesn't exist, try next
      }
    }
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
    try {
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
                (routePath.value === `/${functionName}` ||
                  routePath.value === functionName ||
                  '/' + functionName === routePath.value)
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
    } catch (error) {
      // Ignore parsing errors for arrow functions
    }
    if (!result) {
      try {
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
      } catch (error) {
        // Ignore parsing errors for regular functions
      }
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
