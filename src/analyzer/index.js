/**
 * Analyze functions to determine which ones should be tracked
 * @param {Object} callGraph - Call graph with nodes and edges
 * @param {string} language - Programming language
 * @returns {Promise<Object>} - Analyzed graph with selected nodes
 */
async function analyzeFunctions(callGraph, language) {
  // Mark all functions as selected by default
  const selectedNodes = callGraph.nodes;

  return {
    ...callGraph,
    selectedNodes,
    nodes: callGraph.nodes.map(node => ({
      ...node,
      selected: true,
      reason: 'Selected for tracking'
    }))
  };
}

module.exports = {
  analyzeFunctions
}; 