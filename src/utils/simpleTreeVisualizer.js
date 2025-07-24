/**
 * Simple execution tree visualizer without chalk
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} rootId - Root node ID
 */
function visualizeExecutionTree(nodes, edges, rootId) {
  try {
    console.log('\n🌳 Execution Tree');
    console.log('Function call hierarchy from your agent\'s entry point:\n');
    
    const nodeMap = new Map();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Build tree structure
    const tree = buildTreeStructure(nodes, edges, rootId);
    
    // Display tree
    displayTree(tree, nodeMap, 0);
    
    console.log('');
    console.log(`Total functions: ${nodes.length}`);
    console.log(`Total calls: ${edges.length}`);
  } catch (error) {
    console.warn(`Warning: Could not visualize execution tree: ${error.message}`);
  }
}

/**
 * Build tree structure from nodes and edges
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} rootId - Root node ID
 * @returns {Object} - Tree structure
 */
function buildTreeStructure(nodes, edges, rootId) {
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });
  
  // Build parent-child relationships
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.from);
    const child = nodeMap.get(edge.to);
    if (parent && child) {
      parent.children.push(child);
    }
  });
  
  return nodeMap.get(rootId) || nodes[0];
}

/**
 * Display tree recursively
 * @param {Object} node - Current node
 * @param {Map} nodeMap - Node map
 * @param {number} depth - Current depth
 */
function displayTree(node, nodeMap, depth = 0) {
  if (!node) return;
  
  const connector = '└── ';
  const indent = '    '.repeat(depth);
  
  // Node info
  const typeIcon = node.type === 'endpoint' ? '🌐' : 
                  node.type === 'method' ? '🔧' : 
                  node.type === 'handler' ? '📡' : '⚙️';
  
  const nodeInfo = `${typeIcon} ${node.name}`;
  const fileInfo = `(${node.file}:${node.line})`;
  
  console.log(`${indent}${connector}${nodeInfo} ${fileInfo}`);
  
  // Show metadata if available
  if (node.metadata) {
    const meta = [];
    if (node.metadata.isAsync) meta.push('async');
    if (node.metadata.isExported) meta.push('exported');
    if (node.metadata.parameters && node.metadata.parameters.length > 0) {
      meta.push(`${node.metadata.parameters.length} params`);
    }
    
    if (meta.length > 0) {
      const metaStr = `[${meta.join(', ')}]`;
      console.log(`${indent}    ${metaStr}`);
    }
  }
  
  // Display children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((childId, index) => {
      const child = nodeMap.get(childId);
      if (child) {
        displayTree(child, nodeMap, depth + 1);
      }
    });
  }
}

module.exports = {
  visualizeExecutionTree
}; 