const OpenAI = require('openai');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Use GPT to find possible files based on user input
 * @param {string} userInput - User's file input
 * @param {Array} allFiles - All files in project
 * @returns {Promise<Array>} - Possible file paths with confidence scores
 */
async function findPossibleFilesWithGPT(userInput, allFiles) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a file detection assistant. Given a user's input and a list of files in a project, identify which files are most likely what the user is referring to.

Return a JSON array of objects with the following structure:
{"results": [
{
  "file": "path/to/file.js",
  "confidence": 0.95,
  "reason": "Exact filename match"
}
]}

Confidence should be between 0.0 and 1.0, where:
- 1.0: Exact match (filename or path exactly matches input)
- 0.9-0.99: Very likely match (filename contains input, or very similar)
- 0.7-0.89: Likely match (path contains input, or similar naming)
- 0.5-0.69: Possible match (some similarity)
- 0.0-0.49: Unlikely match

Only include files with confidence > 0.3. Sort by confidence descending.`
        },
        {
          role: "user",
          content: `User is looking for: "${userInput}"

Available files in the project:
${allFiles.map(file => `- ${file}`).join('\n')}

Return the most likely matches as a JSON array.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.results || [];
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    // Fallback to simple pattern matching
    return findPossibleFilesFallback(userInput, allFiles);
  }
}

/**
 * Use GPT to find the correct function in a file
 * @param {string} functionName - User's function name
 * @param {string} filePath - File path
 * @param {string} fileContent - File content
 * @returns {Promise<Array>} - Function matches with confidence scores
 */
async function findFunctionInFileWithGPT(functionName, filePath, fileContent) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a function and endpoint detection assistant. Given a user's input (which could be a function name, endpoint path, or similar), identify all functions and endpoints in the file that could be what the user is referring to.

Return a JSON array of objects with the following structure:
{"results": [
{
  "name": "functionName",
  "line": "exact line number",
  "lineContent": "function functionName() {",
  "type": "function",
  "confidence": 0.95,
  "reason": "Exact function name match"
}
]}

Types can be:
- "function": Regular function definition
- "endpoint": Express route handler or similar endpoint
- "method": Class method or similar
- "handler": Event handler or callback

Confidence should be between 0.0 and 1.0, where:
- 1.0: Exact match (name exactly matches input)
- 0.9-0.99: Very likely match (name contains input, or very similar)
- 0.7-0.89: Likely match (similar naming pattern or related functionality)
- 0.5-0.69: Possible match (some similarity or related context)
- 0.3-0.49: Weak match (minimal similarity)

Include ALL functions and endpoints in the file, sorted by relevance to the user's input. Even if no exact match, return the most relevant ones.`
        },
        {
          role: "user",
          content: `User is looking for: "${functionName}" (this could be a function name, endpoint path, or similar)

File: ${filePath}

File content:
\`\`\`
${fileContent}
\`\`\`

Return all relevant functions and endpoints as a JSON array, sorted by relevance.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.results || [];
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    // Fallback to simple regex matching
    return findFunctionInFileFallback(functionName, fileContent);
  }
}

/**
 * Fallback function for file detection when OpenAI API fails
 * @param {string} userInput - User's file input
 * @param {Array} allFiles - All files in project
 * @returns {Array} - Possible file paths
 */
function findPossibleFilesFallback(userInput, allFiles) {
  const possibleFiles = [];
  const inputLower = userInput.toLowerCase();
  
  // Direct match
  const directMatch = allFiles.find(file => 
    file.toLowerCase() === inputLower || 
    path.basename(file).toLowerCase() === inputLower
  );
  
  if (directMatch) {
    possibleFiles.push({ file: directMatch, confidence: 1.0, reason: 'Exact match' });
  }
  
  // Partial matches
  const partialMatches = allFiles.filter(file => {
    const fileName = path.basename(file).toLowerCase();
    const filePath = file.toLowerCase();
    
    return fileName.includes(inputLower) || 
           filePath.includes(inputLower) ||
           inputLower.includes(fileName.replace(/\.[^/.]+$/, ''));
  });
  
  partialMatches.forEach(file => {
    const fileName = path.basename(file).toLowerCase();
    const filePath = file.toLowerCase();
    
    let confidence = 0.5;
    let reason = 'Partial match';
    
    if (fileName.includes(inputLower)) {
      confidence = 0.8;
      reason = 'Filename contains input';
    }
    
    if (filePath.includes(inputLower)) {
      confidence = 0.7;
      reason = 'Path contains input';
    }
    
    if (!possibleFiles.find(p => p.file === file)) {
      possibleFiles.push({ file, confidence, reason });
    }
  });
  
  return possibleFiles.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Fallback function for function detection when OpenAI API fails
 * @param {string} functionName - User's function name
 * @param {string} fileContent - File content
 * @returns {Array} - Function matches
 */
function findFunctionInFileFallback(functionName, fileContent) {
  const lines = fileContent.split('\n');
  const functionMatches = [];
  
  // JavaScript/TypeScript function patterns
  const jsPatterns = [
    { pattern: new RegExp(`(?:function\\s+)?(${functionName})\\s*\\(`, 'g'), type: 'function' },
    { pattern: new RegExp(`(?:const|let|var)\\s+(${functionName})\\s*=\\s*(?:async\\s*)?\\(`, 'g'), type: 'function' },
    { pattern: new RegExp(`(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s+(${functionName})\\s*\\(`, 'g'), type: 'function' },
    { pattern: new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+(${functionName})\\s*=\\s*(?:async\\s*)?\\(`, 'g'), type: 'function' },
    { pattern: new RegExp(`app\\.(?:get|post|put|delete|patch)\\s*\\(\\s*['"][^'"]*['"]\\s*,\\s*(${functionName})`, 'g'), type: 'endpoint' },
    { pattern: new RegExp(`router\\.(?:get|post|put|delete|patch)\\s*\\(\\s*['"][^'"]*['"]\\s*,\\s*(${functionName})`, 'g'), type: 'endpoint' }
  ];
  
  // Python function patterns
  const pyPatterns = [
    { pattern: new RegExp(`def\\s+(${functionName})\\s*\\(`, 'g'), type: 'function' },
    { pattern: new RegExp(`async\\s+def\\s+(${functionName})\\s*\\(`, 'g'), type: 'function' }
  ];
  
  const patterns = fileContent.includes('def ') ? pyPatterns : jsPatterns;
  
  patterns.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(fileContent)) !== null) {
      const lineNumber = fileContent.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1] || '';
      
      functionMatches.push({
        name: match[1],
        line: lineNumber,
        lineContent: line.trim(),
        type: type,
        confidence: 1.0,
        reason: 'Exact match'
      });
    }
  });
  
  // If no exact match, look for similar names
  if (functionMatches.length === 0) {
    const functionNameLower = functionName.toLowerCase();
    
    // Look for functions with similar names
    const similarPattern = new RegExp(`(?:function|def|const|let|var)\\s+([a-zA-Z_][a-zA-Z0-9_]*${functionNameLower}[a-zA-Z0-9_]*)`, 'gi');
    let match;
    
    while ((match = similarPattern.exec(fileContent)) !== null) {
      const lineNumber = fileContent.substring(0, match.index).split('\n').length;
      const line = lines[lineNumber - 1] || '';
      
      functionMatches.push({
        name: match[1],
        line: lineNumber,
        lineContent: line.trim(),
        type: 'function',
        confidence: 0.6,
        reason: 'Similar name'
      });
    }
  }
  
  return functionMatches.sort((a, b) => b.confidence - a.confidence);
}

module.exports = {
  findPossibleFilesWithGPT,
  findFunctionInFileWithGPT,
  findPossibleFilesFallback,
  findFunctionInFileFallback
}; 