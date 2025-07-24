const { buildExecutionTree } = require('./executionTree');

/**
 * Extract call graph from entry function
 * @param {string} entryFile - Path to entry file
 * @param {string} entryFunction - Name of entry function
 * @param {string} language - Programming language
 * @returns {Promise<Object>} - Call graph with nodes and edges
 */
async function extractCallGraph(entryFile, entryFunction, language) {
  try {
    const projectRoot = process.cwd();
    const executionTree = await buildExecutionTree(entryFile, entryFunction, projectRoot);
    
    // Convert to the expected format
    return {
      nodes: executionTree.nodes.map(node => ({
        id: node.id,
        name: node.name,
        file: node.file,
        line: node.line,
        type: node.type,
        children: node.children,
        metadata: node.metadata,
        selected: false
      })),
      edges: executionTree.edges
    };
  } catch (error) {
    console.warn(`Warning: Could not build execution tree: ${error.message}`);
    
    // Fallback to mock structure
    return {
      nodes: [
        {
          id: entryFunction,
          name: entryFunction,
          file: entryFile,
          line: 1,
          children: [],
          selected: false
        }
      ],
      edges: []
    };
  }
}

module.exports = {
  extractCallGraph
}; 