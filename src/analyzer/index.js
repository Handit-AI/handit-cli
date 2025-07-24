/**
 * Analyze functions to determine which ones should be tracked
 * @param {Object} callGraph - Call graph with nodes and edges
 * @param {string} language - Programming language
 * @returns {Promise<Object>} - Analyzed graph with selected nodes
 */
async function analyzeFunctions(callGraph, language) {
  // TODO: Implement actual function analysis
  // For now, mark functions with AI/API patterns as selected
  
  const selectedNodes = callGraph.nodes.filter(node => {
    // Simple heuristics for now
    const aiPatterns = ['predict', 'generate', 'completion', 'embedding', 'model'];
    const apiPatterns = ['api', 'fetch', 'request', 'call'];
    
    const name = node.name.toLowerCase();
    return aiPatterns.some(pattern => name.includes(pattern)) ||
           apiPatterns.some(pattern => name.includes(pattern));
  });

  return {
    ...callGraph,
    selectedNodes,
    nodes: callGraph.nodes.map(node => ({
      ...node,
      selected: selectedNodes.some(n => n.id === node.id),
      reason: selectedNodes.some(n => n.id === node.id) ? 'Contains AI/API patterns' : 'Not selected'
    }))
  };
}

module.exports = {
  analyzeFunctions
}; 