const fs = require('fs-extra');
const path = require('path');

class FileLogger {
  constructor(logFile = 'handit-debug.log') {
    this.logFile = path.join(process.cwd(), logFile);
    this.ensureLogFile();
  }

  ensureLogFile() {
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '');
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${data ? ` | Data: ${JSON.stringify(data, null, 2)}` : ''}\n`;
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error.message);
      console.log(logLine.trim());
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  // Specific logging methods for handit operations
  logFileDetection(userInput, detectedFiles) {
    this.info('File Detection', {
      userInput,
      detectedFiles: detectedFiles.map(f => ({
        file: f.file,
        confidence: f.confidence,
        reason: f.reason
      }))
    });
  }

  logFunctionDetection(functionName, filePath, detectedFunctions) {
    this.info('Function Detection', {
      functionName,
      filePath,
      detectedFunctions: detectedFunctions.map(f => ({
        name: f.name,
        line: f.line,
        type: f.type,
        confidence: f.confidence
      }))
    });
  }

  logHanditIntegration(filePath, functionName, agentName, lineNumber, changes = null) {
    this.info('Handit Integration', {
      filePath,
      functionName,
      agentName,
      lineNumber,
      changesCount: changes ? changes.length : 0,
      changes: changes
    });
  }

  logCodeGeneration(filePath, originalContent, modifiedContent) {
    this.info('Code Generation', {
      filePath,
      originalLines: originalContent.split('\n').length,
      modifiedLines: modifiedContent.split('\n').length,
      changesApplied: true
    });
  }
}

// Create a singleton instance
const logger = new FileLogger();

module.exports = { FileLogger, logger };
