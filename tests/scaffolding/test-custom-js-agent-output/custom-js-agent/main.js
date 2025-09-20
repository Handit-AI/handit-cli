#!/usr/bin/env node
/**
 * Main application entry point for Custom JS Agent (LangGraph)
 */

import dotenv from 'dotenv';
dotenv.config();
import { configure, startTracing, endTracing } from '@handit.ai/handit-ai';

// Configure Handit
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

import Config from './src/config.js';
import { createGraph } from './src/graph/index.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

class LangGraphAgent {
    constructor() {
        this.config = new Config();
        this.graph = createGraph(this.config);
    }
    
    async process(inputData) {
        /**
         * Process input through the LangGraph
         */
        const result = await this.graph.execute(inputData);
        return result;
    }
    
    getGraphInfo() {
        /**
         * Get information about the graph structure
         */
        return this.graph.getGraphInfo();
    }
}

console.log(`Starting Custom JS Agent (LangGraph)...`);

// Initialize agent
const agent = new LangGraphAgent();

// Print graph information
const graphInfo = agent.getGraphInfo();
console.log(`Graph structure: ${JSON.stringify(graphInfo, null, 2)}`);

// Express server setup
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        agent: 'Custom JS Agent',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Main agent endpoint
app.post('/agent', async (req, res) => {
    try {
        startTracing({ agent: 'Custom JS Agent' });
        const result = await agent.process(req.body);
        res.json({ success: true, result });
    } catch (error) {
        console.error('Agent processing error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        endTracing();
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Custom JS Agent server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🤖 Agent endpoint: http://localhost:${port}/agent`);
});

export { LangGraphAgent };
