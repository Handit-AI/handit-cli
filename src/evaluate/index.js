const fs = require('fs-extra');
const path = require('path');
const ora = require('ora').default;

/**
 * Evaluate collected traces and suggest setup improvements
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Evaluation results with suggestions
 */
async function evaluateTraces(config) {
  const spinner = ora('Analyzing traces...').start();
  
  try {
    // Load traces from file
    const traces = await fs.readJson(config.tracesFile);
    
    // Analyze traces
    const analysis = analyzeTraces(traces);
    
    // Generate suggestions
    const suggestions = generateSuggestions(analysis);
    
    // Create evaluation report
    const evaluation = {
      analyzedFunctions: analysis.functionCount,
      totalTraces: traces.length,
      averageDuration: analysis.averageDuration,
      slowestFunctions: analysis.slowestFunctions,
      mostCalledFunctions: analysis.mostCalledFunctions,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    };
    
    // Save evaluation to file
    await fs.writeJson(config.outputFile, evaluation, { spaces: 2 });
    
    spinner.succeed(`Analyzed ${traces.length} traces`);
    
    return evaluation;
  } catch (error) {
    spinner.fail('Failed to analyze traces');
    throw error;
  }
}

/**
 * Analyze traces to extract insights
 * @param {Array} traces - Array of trace objects
 * @returns {Object} - Analysis results
 */
function analyzeTraces(traces) {
  const functionStats = {};
  let totalDuration = 0;
  
  // Aggregate function statistics
  traces.forEach(trace => {
    const funcName = trace.function;
    
    if (!functionStats[funcName]) {
      functionStats[funcName] = {
        count: 0,
        totalDuration: 0,
        calls: new Set(),
        metadata: []
      };
    }
    
    functionStats[funcName].count++;
    functionStats[funcName].totalDuration += trace.duration;
    totalDuration += trace.duration;
    
    if (trace.calls) {
      trace.calls.forEach(call => functionStats[funcName].calls.add(call));
    }
    
    if (trace.metadata) {
      functionStats[funcName].metadata.push(trace.metadata);
    }
  });
  
  // Calculate averages and find extremes
  const functionCount = Object.keys(functionStats).length;
  const averageDuration = totalDuration / traces.length;
  
  const slowestFunctions = Object.entries(functionStats)
    .map(([name, stats]) => ({
      name,
      averageDuration: stats.totalDuration / stats.count,
      count: stats.count
    }))
    .sort((a, b) => b.averageDuration - a.averageDuration)
    .slice(0, 5);
  
  const mostCalledFunctions = Object.entries(functionStats)
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      averageDuration: stats.totalDuration / stats.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    functionCount,
    averageDuration,
    slowestFunctions,
    mostCalledFunctions,
    functionStats
  };
}

/**
 * Generate suggestions based on trace analysis
 * @param {Object} analysis - Analysis results
 * @returns {Array} - Array of suggestions
 */
function generateSuggestions(analysis) {
  const suggestions = [];
  
  // Check for slow functions
  analysis.slowestFunctions.forEach(func => {
    if (func.averageDuration > 1000) {
      suggestions.push({
        type: 'performance',
        priority: 'high',
        description: `Function "${func.name}" is slow (${Math.round(func.averageDuration)}ms avg). Consider optimization.`,
        action: 'optimize_function',
        target: func.name
      });
    }
  });
  
  // Check for frequently called functions
  analysis.mostCalledFunctions.forEach(func => {
    if (func.count > 10) {
      suggestions.push({
        type: 'monitoring',
        priority: 'medium',
        description: `Function "${func.name}" is called frequently (${func.count} times). Consider caching or memoization.`,
        action: 'add_caching',
        target: func.name
      });
    }
  });
  
  // Check for functions with API calls
  const apiFunctions = Object.entries(analysis.functionStats)
    .filter(([name, stats]) => 
      stats.metadata.some(meta => meta.url || meta.method)
    );
  
  apiFunctions.forEach(([name, stats]) => {
    suggestions.push({
      type: 'instrumentation',
      priority: 'high',
      description: `Function "${name}" makes API calls. Ensure proper error handling and timeout configuration.`,
      action: 'add_error_handling',
      target: name
    });
  });
  
  // Check for functions with model calls
  const modelFunctions = Object.entries(analysis.functionStats)
    .filter(([name, stats]) => 
      stats.metadata.some(meta => meta.model || meta.tokens_used)
    );
  
  modelFunctions.forEach(([name, stats]) => {
    suggestions.push({
      type: 'ai_monitoring',
      priority: 'high',
      description: `Function "${name}" uses AI models. Monitor token usage and response quality.`,
      action: 'add_ai_monitoring',
      target: name
    });
  });
  
  return suggestions;
}

module.exports = {
  evaluateTraces
}; 