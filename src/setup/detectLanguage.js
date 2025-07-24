const fs = require('fs-extra');
const path = require('path');

/**
 * Detect the programming language of the project
 * @param {string} projectRoot - Path to project root
 * @returns {Promise<string>} - 'javascript' or 'python'
 */
async function detectLanguage(projectRoot) {
  try {
    // Check for package.json (JavaScript/Node.js)
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      return 'javascript';
    }

    // Check for requirements.txt or .py files (Python)
    const requirementsPath = path.join(projectRoot, 'requirements.txt');
    if (await fs.pathExists(requirementsPath)) {
      return 'python';
    }

    // Check for .py files in the project
    const pyFiles = await findFiles(projectRoot, '*.py');
    if (pyFiles.length > 0) {
      return 'python';
    }

    // Check for .js/.ts files
    const jsFiles = await findFiles(projectRoot, '*.js');
    const tsFiles = await findFiles(projectRoot, '*.ts');
    if (jsFiles.length > 0 || tsFiles.length > 0) {
      return 'javascript';
    }

    // Default to JavaScript if no clear indicators
    return 'javascript';
  } catch (error) {
    throw new Error(`Failed to detect language: ${error.message}`);
  }
}

/**
 * Find files matching a pattern recursively
 * @param {string} dir - Directory to search
 * @param {string} pattern - File pattern (e.g., '*.py')
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findFiles(dir, pattern) {
  const files = [];
  
  try {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        const subFiles = await findFiles(fullPath, pattern);
        files.push(...subFiles);
      } else if (stat.isFile() && item.match(pattern.replace('*', '.*'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors and continue
  }
  
  return files;
}

module.exports = {
  detectLanguage
}; 