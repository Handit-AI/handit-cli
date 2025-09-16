const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { EnvironmentConfig } = require('../config/environment');
const { TokenStorage } = require('../auth/tokenStorage');

const config = new EnvironmentConfig();
const apiUrl = config.getApiUrl();

/**
 * Debug logger that works with Ink UI
 * Writes to a debug file and also tries console.log
 */
function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  // Try console.log first (might work in some contexts)
  try {
    console.log(logMessage);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    // Console might not be available in Ink context
  }
  
  // Always write to debug file
  try {
    const debugFile = path.join(__dirname, '../../debug-openai.log');
    const logEntry = data 
      ? `${logMessage}\n${JSON.stringify(data, null, 2)}\n---\n`
      : `${logMessage}\n---\n`;
    
    fs.appendFileSync(debugFile, logEntry);
  } catch (e) {
    // If we can't write to file, at least try to write to stderr
    try {
      process.stderr.write(logMessage + '\n');
    } catch (e2) {
      // Last resort - do nothing
    }
  }
}

/**
 * Get authentication headers for API calls
 */
async function getAuthHeaders() {
  const tokenStorage = new TokenStorage();
  const tokens = await tokenStorage.loadTokens();
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (tokens && tokens.authToken) {
    headers['Authorization'] = `Bearer ${tokens.authToken}`;
  }

  return headers;
}

/**
 * Call the Handit CLI API for LLM completions
 * @param {Object} params - Parameters for the API call
 * @param {Array} params.messages - Messages array
 * @param {string} params.model - Model name
 * @param {Object} params.response_format - Response format (optional)
 * @param {number} params.temperature - Temperature (optional)
 * @param {number} params.max_tokens - Max tokens (optional)
 * @returns {Promise<Object>} - API response
 */
async function callLLMAPI({ messages, model, response_format, temperature, max_tokens }) {
  debugLog('callLLMAPI called', {
    model,
    messageCount: messages.length,
    response_format,
    temperature,
    max_tokens,
    apiUrl
  });

  try {
    const headers = await getAuthHeaders();
    debugLog('Auth headers obtained', { 
      hasAuth: !!headers.Authorization,
      headerKeys: Object.keys(headers)
    });
    
    const requestBody = {
      messages,
      model,
      ...(response_format && { responseFormat: response_format }),
      ...(temperature !== undefined && { temperature }),
      ...(max_tokens && { max_tokens })
    };

    debugLog('Making HTTP request', {
      url: `${apiUrl}/cli/auth/llm`,
      bodySize: JSON.stringify(requestBody).length,
      hasMessages: !!requestBody.messages,
      messageCount: requestBody.messages.length
    });

    const response = await axios.post(`${apiUrl}/cli/auth/llm`, requestBody, {
      headers,
      timeout: 30000 // 30 second timeout
    });

    debugLog('HTTP response received', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      hasResult: !!response.data.result,
      resultType: typeof response.data.result
    });

    if (!response.data || !response.data.result) {
      throw new Error('Invalid response structure - missing data.result');
    }

    return response.data.result;
  } catch (error) {
    debugLog('LLM API error', {
      error: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data
    });
    
    // Try console.error as well
    try {
      console.error('LLM API error:', error.message);
    } catch (e) {
      // Ignore console errors
    }
    
    throw error;
  }
}

/**
 * Use GPT to find possible files based on user input
 * @param {string} userInput - User's file input
 * @param {Array} allFiles - All files in project
 * @returns {Promise<Array>} - Possible file paths with confidence scores
 */
async function findPossibleFilesWithGPT(userInput, allFiles) {
  debugLog('findPossibleFilesWithGPT called', {
    userInput,
    allFilesCount: allFiles.length,
    allFiles: allFiles // Log first 10 files to avoid huge logs
  });

  try {
    const requestPayload = {
      model: "gpt-4o",
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
    };

    debugLog('Making LLM API call', {
      model: requestPayload.model,
      messageCount: requestPayload.messages.length,
      userContentLength: requestPayload.messages[1].content.length,
      allFilesCount: allFiles.length
    });

    const response = await callLLMAPI(requestPayload);
    
    debugLog('LLM API response received', {
      responseType: typeof response,
      hasChoices: response && response.choices,
      choicesLength: response && response.choices ? response.choices.length : 0,
      firstChoiceContent: response && response.choices && response.choices[0] ? 
        response.choices[0].message.content.substring(0, 200) + '...' : 'No content'
    });

    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response structure from LLM API');
    }

    const content = response.choices[0].message.content;
    debugLog('Parsing JSON response', { contentLength: content.length });

    let result;
    try {
      result = JSON.parse(content);
      debugLog('JSON parsed successfully', { 
        hasResults: !!result.results,
        resultsLength: result.results ? result.results.length : 0,
        results: result.results
      });
    } catch (parseError) {
      debugLog('JSON parse error', { 
        error: parseError.message,
        content: content.substring(0, 500)
      });
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    if (!result.results || !Array.isArray(result.results)) {
      debugLog('Invalid result structure', { result });
      throw new Error('Response does not contain valid results array');
    }

    debugLog('Returning results', { 
      resultCount: result.results.length,
      results: result.results
    });

    return result.results;
  } catch (error) {
    debugLog('Error in findPossibleFilesWithGPT', {
      error: error.message,
      stack: error.stack,
      userInput,
      allFilesCount: allFiles.length
    });
    
    debugLog('Falling back to pattern matching');
    const fallbackResult = findPossibleFilesFallback(userInput, allFiles);
    debugLog('Fallback result', { 
      resultCount: fallbackResult.length,
      results: fallbackResult
    });
    
    return fallbackResult;
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
    const response = await callLLMAPI({
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
    console.error('LLM API error:', error.message);
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
  callLLMAPI,
  findPossibleFilesWithGPT,
  findFunctionInFileWithGPT,
  findPossibleFilesFallback,
  findFunctionInFileFallback
}; 