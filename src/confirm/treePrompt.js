const inquirer = require('inquirer').default;
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

  console.log(chalk.blue.bold('\n🌳 Function Selection'));
  console.log(chalk.gray('Review and select which functions to track:\n'));

  // Display tree structure
  displayTree(analyzedGraph.nodes);

  const questions = [
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Proceed with the selected functions?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  if (!answers.proceed) {
    throw new Error('User cancelled the operation');
  }

  return analyzedGraph;
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