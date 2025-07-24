// Removed chalk dependency to avoid formatting issues

/**
 * Visualize execution tree in CLI
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
 * @param {Array} prefix - Prefix for tree lines
 */
function displayTree(node, nodeMap, depth = 0, prefix = []) {
  if (!node) return;
  
  const isLast = depth === 0 || true; // For now, treat all as last
  const connector = isLast ? '└── ' : '├── ';
  const indent = '    '.repeat(depth);
  
  // Node info
  const typeIcon = node.type === 'endpoint' ? '🌐' : 
                  node.type === 'method' ? '🔧' : 
                  node.type === 'handler' ? '📡' : '⚙️';
  
  const nodeInfo = `${typeIcon} ${chalk.blue(node.name)}`;
  const fileInfo = chalk.gray(`(${node.file}:${node.line})`;
  
  console.log(`${indent}${connector}${nodeInfo} ${fileInfo}`);
  
  // Show metadata if available
  if (node.metadata) {
    const meta = [];
    if (node.metadata.isAsync) meta.push('async');
    if (node.metadata.isExported) meta.push('exported');
    if (node.metadata.parameters.length > 0) {
      meta.push(`${node.metadata.parameters.length} params`);
    }
    
    if (meta.length > 0) {
      const metaStr = chalk.gray(`[${meta.join(', ')}]`);
      console.log(`${indent}    ${metaStr}`);
    }
  }
  
  // Display children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((childId, index) => {
      const child = nodeMap.get(childId);
      if (child) {
        const isLastChild = index === node.children.length - 1;
        const newPrefix = [...prefix, !isLastChild];
        displayTree(child, nodeMap, depth + 1, newPrefix);
      }
    });
  }
}

/**
 * Get tree statistics
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @returns {Object} - Statistics
 */
function getTreeStatistics(nodes, edges) {
  const stats = {
    totalFunctions: nodes.length,
    totalCalls: edges.length,
    maxDepth: 0,
    avgChildren: 0,
    leafNodes: 0,
    rootNodes: 0
  };
  
  // Count leaf nodes (nodes with no children)
  const childrenCount = new Map();
  edges.forEach(edge => {
    childrenCount.set(edge.from, (childrenCount.get(edge.from) || 0) + 1);
  });
  
  stats.leafNodes = nodes.filter(node => !childrenCount.has(node.id)).length;
  stats.rootNodes = nodes.filter(node => 
    !edges.some(edge => edge.to === node.id)
  ).length;
  
  if (nodes.length > 0) {
    stats.avgChildren = edges.length / nodes.length;
  }
  
  return stats;
}

module.exports = {
  visualizeExecutionTree,
  getTreeStatistics
}; 