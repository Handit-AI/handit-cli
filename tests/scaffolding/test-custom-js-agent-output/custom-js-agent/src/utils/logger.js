/**
 * Logging configuration for Custom JS Agent
 */

const winston = require('winston');

class Logger {
    constructor(level = 'info', logFile = null) {
        this.logger = winston.createLogger({
            level: level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'Custom JS Agent' },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
        
        if (logFile) {
            this.logger.add(new winston.transports.File({ filename: logFile }));
        }
    }
    
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }
    
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }
    
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
    
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
}

function setupLogging(level = 'info', logFile = null) {
    /**
     * Set up logging configuration.
     * 
     * @param {string} level - Logging level (debug, info, warn, error)
     * @param {string} logFile - Optional log file path
     * @returns {Logger} Configured logger instance
     */
    return new Logger(level, logFile);
}

function getLogger(name) {
    /**
     * Get a logger instance for a specific module.
     * 
     * @param {string} name - Logger name (usually __filename)
     * @returns {Logger} Logger instance
     */
    return new Logger();
}

module.exports = { Logger, setupLogging, getLogger };
