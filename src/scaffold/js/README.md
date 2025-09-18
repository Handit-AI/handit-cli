# JavaScript/TypeScript Agent Scaffolding

This directory contains JavaScript and TypeScript scaffolding templates and generators for creating AI agents with Handit.ai integration.

## Structure

```
js/
├── templates/           # Template files for different runtimes
│   ├── express/         # Express web service templates
│   ├── cli/             # Command-line interface templates
│   └── worker/          # Background worker templates
├── generators/          # Code generation logic
│   ├── base.js         # Base JS/TS generator
│   ├── langchain.js    # LangChain-specific generator
│   └── langgraph.js    # LangGraph-specific generator
└── README.md           # This file
```

## Supported Runtimes

### Express
- **Use case**: Web APIs, REST endpoints, microservices
- **Features**: Middleware support, routing, JSON handling
- **Port**: Default 3000
- **Example**: Chat API, document processing service

### CLI
- **Use case**: Command-line tools, batch processing
- **Features**: Argument parsing, progress indicators, file I/O
- **Example**: Data processing scripts, automation tools

### Worker
- **Use case**: Background processing, queue workers
- **Features**: Queue integration, retry logic, monitoring
- **Example**: Email processing, image generation

## Supported Frameworks

### Base
- **Description**: Pure JavaScript/TypeScript implementation
- **Best for**: Simple agents, custom implementations
- **Features**: Async/await, error handling, logging

### LangChain
- **Description**: LangChain.js framework integration
- **Best for**: Complex chains, tool integration, memory
- **Features**: Chain composition, tool calling, memory management

### LangGraph
- **Description**: LangGraph.js state-based agent framework
- **Best for**: Complex workflows, state management, branching logic
- **Features**: State graphs, conditional routing, cycle handling

## Generated Project Structure

```
project-name/
├── src/
│   ├── nodes/              # Agent execution nodes
│   │   ├── retrieve/
│   │   │   ├── logic.js    # Node execution logic
│   │   │   └── prompts.js  # Prompt definitions
│   │   ├── reason/
│   │   └── act/
│   ├── main.js             # Application entry point
│   ├── config.js           # Configuration management
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── package.json            # Node.js dependencies
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## Node Structure

Each node contains two main files:

### logic.js
```javascript
const { startTracing, endTracing } = require('@handit.ai/handit-ai');
const { getPrompts } = require('./prompts');

class NodeLogic {
    constructor(config) {
        this.config = config;
        this.prompts = getPrompts();
    }
    
    async execute(inputData) {
        startTracing({ agent: 'NodeName' });
        try {
            // Your custom logic here
            const result = await this.processInput(inputData);
            return result;
        } finally {
            endTracing();
        }
    }
    
    async processInput(data) {
        // Implement your processing logic
    }
}

module.exports = { NodeLogic };
```

### prompts.js
```javascript
function getPrompts() {
    /**
     * Define prompts for this node.
     * Customize these prompts for your specific use case.
     */
    return {
        system: "You are a helpful AI assistant...",
        userTemplate: "Process this input: {input}",
        examples: [
            { input: "example input", output: "example output" }
        ]
    };
}

module.exports = { getPrompts };
```

## Handit Integration

All generated JavaScript/TypeScript projects include automatic Handit.ai integration:

```javascript
// Automatic imports
const { configure, startTracing, endTracing } = require('@handit.ai/handit-ai');

// Configuration
configure({ HANDIT_API_KEY: process.env.HANDIT_API_KEY });

// Tracing
async function mainFunction() {
    startTracing({ agent: 'AgentName' });
    try {
        // Your code here
    } finally {
        endTracing();
    }
}
```

## Dependencies

Generated projects include these key dependencies:

- **@handit.ai/handit-ai**: Handit.ai monitoring and tracing
- **express**: Web framework (for Express runtime)
- **cors**: CORS middleware (for Express runtime)
- **helmet**: Security middleware (for Express runtime)
- **langchain**: LangChain.js framework (if selected)
- **langgraph**: LangGraph.js framework (if selected)
- **dotenv**: Environment variable management
- **joi**: Data validation
- **winston**: Logging

## Configuration

Environment variables are managed through `.env` files:

```bash
# .env.example
HANDIT_API_KEY=your_handit_api_key_here
MODEL_PROVIDER=mock
MODEL_NAME=mock-llm
PORT=3000
MEMORY_STORAGE=faiss-local
CACHE_STORAGE=in-memory
SQL_STORAGE=sqlite
```

## TypeScript Support

For TypeScript projects, additional type definitions are included:

```typescript
// types/index.ts
export interface NodeConfig {
    model: {
        provider: string;
        name: string;
    };
    storage: {
        memory: string;
        cache: string;
        sql: string;
    };
}

export interface NodeInput {
    data: any;
    context?: Record<string, any>;
}

export interface NodeOutput {
    result: any;
    metadata?: Record<string, any>;
}
```

## Testing

Generated projects include a test structure:

```javascript
// tests/nodes.test.js
const { NodeLogic } = require('../src/nodes/retrieve/logic');

describe('Retrieve Node', () => {
    test('should process input correctly', async () => {
        const logic = new NodeLogic({});
        const result = await logic.execute({ input: 'test' });
        expect(result).toBeDefined();
    });
});
```

## Best Practices

Generated JavaScript/TypeScript projects follow these best practices:

- **ES6+ syntax**: Modern JavaScript features
- **Async/await**: Proper async programming patterns
- **Error handling**: Comprehensive exception handling
- **Logging**: Structured logging with winston
- **Configuration**: Environment-based configuration management
- **Testing**: Pre-configured test structure with Jest
- **Documentation**: Comprehensive JSDoc comments
- **Type safety**: TypeScript support with proper types

## Package.json Structure

Generated `package.json` includes:

```json
{
  "name": "agent-project",
  "version": "1.0.0",
  "description": "Handit-powered AI agent",
  "main": "src/main.js",
  "scripts": {
    "start": "node src/main.js",
    "dev": "nodemon src/main.js",
    "test": "jest",
    "lint": "eslint src/",
    "build": "tsc"
  },
  "dependencies": {
    "@handit.ai/handit-ai": "^1.0.0",
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "nodemon": "^2.0.0"
  }
}
```

## Customization

After generation, customize your agent by:

1. **Implementing node logic**: Edit `src/nodes/*/logic.js`
2. **Customizing prompts**: Modify `src/nodes/*/prompts.js`
3. **Adding tools**: Implement additional tools in `src/tools/`
4. **Configuring models**: Update model settings in `src/config.js`
5. **Adding middleware**: Customize Express middleware (for Express runtime)
6. **Type definitions**: Add TypeScript types in `types/` directory

## Examples

See the `examples/` directory for sample JavaScript/TypeScript agent configurations and generated code.
