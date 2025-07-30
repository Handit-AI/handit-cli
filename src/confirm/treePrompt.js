const { simpleTreeSelection } = require('./interactiveTree');
const chalk = require('chalk');

/**
 * Show interactive tree for user confirmation
 * @param {Object} analyzedGraph - Graph with analyzed nodes
 * @param {boolean} nonInteractive - Skip prompts if true
 * @returns {Promise<Object>} - Confirmed graph
 */
async function confirmSelection(analyzedGraph, nonInteractive = false) {
  if (nonInteractive) {
    return analyzedGraph;
  }

  try {
    // Use simple tree selection with proper indentation
    const selectedNodeIds = await simpleTreeSelection(
      analyzedGraph.nodes, 
      analyzedGraph.edges, 
      analyzedGraph.nodes[0]?.id
    );
    
    // Update the graph with the selected nodes
    const confirmedNodes = analyzedGraph.nodes.map(node => ({
      ...node,
      selected: selectedNodeIds.includes(node.id)
    }));
    
    return {
      ...analyzedGraph,
      nodes: confirmedNodes,
      selectedNodes: confirmedNodes.filter(node => node.selected)
    };
  } catch (error) {
    throw new Error(`Confirmation failed: ${error.message}`);
  }
}

/**
 * Display function tree in console
 * @param {Array} nodes - Function nodes
 */
function displayTree(nodes) {
  nodes.forEach(node => {
    const status = node.selected ? chalk.green('✓') : chalk.gray('○');
    const name = node.selected ? chalk.blue(node.name) : node.name;
    console.log(`  ${status} ${name} (${node.file}:${node.line})`);
    if (node.reason) {
      console.log(chalk.gray(`      Reason: ${node.reason}`));
    }
  });
}

module.exports = {
  confirmSelection
}; 