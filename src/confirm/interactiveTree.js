const inquirer = require('inquirer');
const chalk = require('chalk');

/**
 * Interactive tree selection with navigation and toggle functionality
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} rootId - Root node ID
 * @returns {Promise<Array>} - Array of selected node IDs
 */
async function interactiveTreeSelection(nodes, edges, rootId) {
  // Build tree structure
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [], selected: true }); // Default to selected
  });
  
  // Build parent-child relationships
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.from);
    const child = nodeMap.get(edge.to);
    if (parent && child) {
      parent.children.push(child.id); // Store child ID, not the child object
    }
  });
  
  const root = nodeMap.get(rootId) || nodes[0];
  
  // Flatten tree for navigation
  const flatNodes = flattenTree(root, nodeMap, 0);
  
  let currentIndex = 0;
  let done = false;
  
  while (!done) {
    // Clear console and show current state
    console.clear();
    console.log(chalk.blue.bold('\n🌳 Interactive Function Selection'));
    console.log(chalk.gray('Navigate with arrow keys, toggle with space, confirm with Enter\n'));
    
    // Display all nodes with current selection highlighted
    flatNodes.forEach((node, index) => {
      const isSelected = node.selected;
      const isCurrent = index === currentIndex;
      
      let prefix = '  ';
      if (isCurrent) {
        prefix = chalk.yellow('> ');
      } else {
        prefix = '  ';
      }
      
      const status = isSelected ? chalk.green('✓') : chalk.red('✗');
      const typeIcon = node.type === 'endpoint' ? '🌐' : 
                      node.type === 'method' ? '🔧' : 
                      node.type === 'handler' ? '📡' : '⚙️';
      
      const indent = '  '.repeat(node.depth);
      const nodeInfo = `${typeIcon} ${node.name}`;
      const fileInfo = chalk.gray(`(${node.file}:${node.line})`);
      
      let line = `${prefix}${indent}${status} ${nodeInfo} ${fileInfo}`;
      
      if (isCurrent) {
        line = chalk.yellow(line);
      }
      
      console.log(line);
    });
    
    console.log('\n' + chalk.gray('Controls: ↑↓ Navigate | Space Toggle | Enter Confirm'));
    
    // Get user input
    const { action } = await inquirer.prompt([
      {
        type: 'input',
        name: 'action',
        message: 'Action:',
        validate: (input) => {
          const validInputs = ['up', 'down', 'space', 'enter', 'w', 's', ' '];
          if (validInputs.includes(input.toLowerCase())) {
            return true;
          }
          return 'Use arrow keys, w/s, space, or enter';
        }
      }
    ]);
    
    const input = action.toLowerCase();
    
    switch (input) {
      case 'up':
      case 'w':
        currentIndex = Math.max(0, currentIndex - 1);
        break;
      case 'down':
      case 's':
        currentIndex = Math.min(flatNodes.length - 1, currentIndex + 1);
        break;
      case 'space':
      case ' ':
        flatNodes[currentIndex].selected = !flatNodes[currentIndex].selected;
        break;
      case 'enter':
        done = true;
        break;
    }
  }
  
  // Return selected node IDs
  return flatNodes.filter(node => node.selected).map(node => node.id);
}

/**
 * Flatten tree into array with depth information
 * @param {Object} node - Current node
 * @param {Map} nodeMap - Node map
 * @param {number} depth - Current depth
 * @returns {Array} - Flattened array of nodes
 */
function flattenTree(node, nodeMap, depth) {
  const result = [];
  
  if (node) {
    result.push({
      ...node,
      depth: depth
    });
    
    // Add children recursively
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(childId => {
        const child = nodeMap.get(childId);
        if (child) {
          result.push(...flattenTree(child, nodeMap, depth + 1));
        }
      });
    }
  }
  
  return result;
}

/**
 * Simple tree selection (fallback)
 * @param {Array} nodes - Array of nodes
 * @param {Array} edges - Array of edges
 * @param {string} rootId - Root node ID
 * @returns {Promise<Array>} - Array of selected node IDs
 */
async function simpleTreeSelection(nodes, edges, rootId) {
  // Build tree structure
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [], selected: true }); // Default to selected
  });
  
  // Build parent-child relationships
  edges.forEach(edge => {
    const parent = nodeMap.get(edge.from);
    const child = nodeMap.get(edge.to);
    if (parent && child) {
      parent.children.push(child.id); // Store child ID, not the child object
    }
  });
  
  const root = nodeMap.get(rootId) || nodes[0];
  
  // Display tree
  console.log(chalk.blue.bold('\n🌳 Function Selection'));
  console.log(chalk.gray('All functions are selected by default. Review and confirm:\n'));
  
  displayTreeWithSelection(root, nodeMap, 0);
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed with the selected functions?',
      default: true
    }
  ]);
  
  if (!confirm) {
    // Show interactive selection list
    console.log(chalk.yellow('\n🎯 Custom Function Selection'));
    console.log(chalk.gray('Select which functions to track:\n'));
    
    const choices = nodes.map(node => ({
      name: `${node.name} ${chalk.gray(`(${node.file}:${node.line})`)}`,
      value: node.id,
      checked: true // All selected by default
    }));
    
    const { selectedFunctions } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFunctions',
        message: 'Choose functions to track:',
        choices: choices,
        pageSize: 15,
        validate: (answer) => {
          if (answer.length === 0) {
            return 'You must select at least one function to track.';
          }
          return true;
        }
      }
    ]);
    
    return selectedFunctions;
  }
  
  // Return all node IDs (all selected by default)
  return nodes.map(node => node.id);
}

/**
 * Display tree with selection status
 * @param {Object} node - Current node
 * @param {Map} nodeMap - Node map
 * @param {number} depth - Current depth
 */
function displayTreeWithSelection(node, nodeMap, depth = 0) {
  if (!node) return;
  
  const connector = depth === 0 ? '└── ' : '├── ';
  const indent = '    '.repeat(depth);
  
  const status = node.selected ? chalk.green('✓') : chalk.red('✗');
  const typeIcon = node.type === 'endpoint' ? '🌐' : 
                  node.type === 'method' ? '🔧' : 
                  node.type === 'handler' ? '📡' : '⚙️';
  
  const nodeInfo = `${typeIcon} ${node.name}`;
  const fileInfo = chalk.gray(`(${node.file}:${node.line})`);
  
  console.log(`${indent}${connector}${status} ${nodeInfo} ${fileInfo}`);
  
  // Display children recursively
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((childId, index) => {
      const child = nodeMap.get(childId);
      if (child) {
        displayTreeWithSelection(child, nodeMap, depth + 1);
      }
    });
  }
}

module.exports = {
  interactiveTreeSelection,
  simpleTreeSelection
}; 