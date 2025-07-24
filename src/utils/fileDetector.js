const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk');
const inquirer = require('inquirer').default;
const { findPossibleFilesWithGPT, findFunctionInFileWithGPT } = require('./openai');

/**
 * Get all files in the project recursively
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Array>} - Array of file paths
 */
async function getAllFiles(projectRoot) {
  const patterns = [
    '**/*.js',
    '**/*.ts',
    '**/*.py',
    '**/*.jsx',
    '**/*.tsx'
  ];
  
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
        'yarn.lock'
      ]
    });
    files.push(...matches);
  }
  
  return files.sort();
}

/**
 * Use AI to find possible file paths based on user input
 * @param {string} userInput - User's file input
 * @param {Array} allFiles - All files in project
 * @returns {Promise<Array>} - Possible file paths
 */
async function findPossibleFiles(userInput, allFiles) {
  // Check if there's only one file with that exact name
  const exactMatches = allFiles.filter(file => 
    path.basename(file).toLowerCase() === userInput.toLowerCase() ||
    file.toLowerCase() === userInput.toLowerCase()
  );
  
  if (exactMatches.length === 1) {
    return [{ file: exactMatches[0], confidence: 1.0, reason: 'Exact match' }];
  }
  
  // If multiple files or no exact match, use GPT
  return await findPossibleFilesWithGPT(userInput, allFiles);
}

/**
 * Use AI to find the correct function in a file
 * @param {string} functionName - User's function name
 * @param {string} filePath - File path
 * @param {string} projectRoot - Project root
 * @returns {Promise<Object>} - Function information
 */
async function findFunctionInFile(functionName, filePath, projectRoot) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf8');
    
    // Use GPT to find functions
    const functionMatches = await findFunctionInFileWithGPT(functionName, filePath, content);
    
    return {
      filePath,
      content,
      functions: functionMatches
    };
    
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error.message}`);
  }
}

/**
 * Smart file and function detection with AI assistance
 * @param {string} userFileInput - User's file input
 * @param {string} userFunctionInput - User's function input
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Object>} - Detected file and function
 */
async function detectFileAndFunction(userFileInput, userFunctionInput, projectRoot) {
  console.log(chalk.blue.bold('\n🔍 Smart File Detection'));
  console.log(chalk.gray('Using AI to find the correct file and function...\n'));
  
  // Step 1: Get all files in project
  const allFiles = await getAllFiles(projectRoot);
  
  // Step 2: Find possible files
  const possibleFiles = await findPossibleFiles(userFileInput, allFiles);
  
  if (possibleFiles.length === 0) {
    throw new Error(`No files found matching "${userFileInput}". Please check the file path.`);
  }
  
  // Step 3: If multiple files found, let user choose
  let selectedFile = possibleFiles[0];
  
  if (possibleFiles.length > 1) {
    console.log(chalk.yellow(`Found ${possibleFiles.length} possible files:`));
    possibleFiles.forEach((file, index) => {
      console.log(chalk.white(`  ${index + 1}. ${file.file} (${file.reason})`));
    });
    console.log('');
    
    const { fileChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'fileChoice',
        message: 'Which file contains your agent\'s entry function?',
        choices: possibleFiles.map((file, index) => ({
          name: `${file.file} (${file.reason})`,
          value: index
        }))
      }
    ]);
    
    selectedFile = possibleFiles[fileChoice];
  }
  
  // Step 4: Find functions in the selected file
  const fileAnalysis = await findFunctionInFile(userFunctionInput, selectedFile.file, projectRoot);
  
  if (fileAnalysis.functions.length === 0) {
    throw new Error(`No functions or endpoints found in ${selectedFile.file}. Please check the function name or endpoint path.`);
  }
  
  // Step 5: If multiple functions found, let user choose
  let selectedFunction = fileAnalysis.functions[0];
  
  if (fileAnalysis.functions.length > 1) {
    console.log(chalk.yellow(`Found ${fileAnalysis.functions.length} possible functions/endpoints in ${selectedFile.file}:`));
    console.log('');
    
    const { functionChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'functionChoice',
        message: 'Which function or endpoint is your agent\'s entry point?',
        choices: fileAnalysis.functions.map((func, index) => {
          const typeIcon = func.type === 'endpoint' ? '🌐' : 
                          func.type === 'method' ? '🔧' : 
                          func.type === 'handler' ? '📡' : '⚙️';
          
          const confidenceColor = func.confidence >= 0.9 ? chalk.green : 
                                 func.confidence >= 0.7 ? chalk.yellow : 
                                 func.confidence >= 0.5 ? chalk.blue : chalk.gray;
          
          return {
            name: `${typeIcon} ${confidenceColor(func.name)} (line ${func.line}) - ${chalk.gray(func.lineContent)}`,
            value: index
          };
        })
      }
    ]);
    
    selectedFunction = fileAnalysis.functions[functionChoice];
  }
  
  // Step 6: Confirm with user
  console.log(chalk.green.bold('\n✅ File and Function Detected'));
  console.log(chalk.gray('Please confirm the detected entry point:\n'));
  
  const typeIcon = selectedFunction.type === 'endpoint' ? '🌐' : 
                  selectedFunction.type === 'method' ? '🔧' : 
                  selectedFunction.type === 'handler' ? '📡' : '⚙️';
  
  console.log(chalk.white(`  File: ${chalk.blue(selectedFile.file)}`));
  console.log(chalk.white(`  Type: ${typeIcon} ${chalk.blue(selectedFunction.type || 'function')}`));
  console.log(chalk.white(`  Name: ${chalk.blue(selectedFunction.name)}`));
  console.log(chalk.white(`  Line: ${chalk.blue(selectedFunction.line)}`));
  console.log(chalk.white(`  Code: ${chalk.gray(selectedFunction.lineContent)}`));
  console.log('');
  
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Is this the correct entry point for your agent?',
      default: true
    }
  ]);
  
  if (!confirm) {
    console.log(chalk.yellow('Detection cancelled. Please try again with more specific input.'));
    process.exit(0);
  }
  
  return {
    file: selectedFile.file,
    function: selectedFunction.name,
    line: selectedFunction.line
  };
}

module.exports = {
  detectFileAndFunction,
  getAllFiles,
  findPossibleFiles,
  findFunctionInFile
}; 