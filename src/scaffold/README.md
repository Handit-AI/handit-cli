# Handit Agent Scaffolding Service

This service generates complete AI agent projects based on JSON configuration, automatically integrating Handit.ai monitoring and following best practices for agent development.

## Overview

The scaffolding service creates production-ready agent projects with:

- **Node-based architecture**: Each agent stage becomes a modular node
- **Automatic Handit integration**: Pre-configured monitoring and tracing
- **Best practices**: Proper project structure, error handling, logging
- **Multiple runtimes**: FastAPI, Express, CLI, Worker support
- **Framework support**: LangChain, LangGraph, and base implementations

## Usage

```javascript
const { ScaffoldingService } = require('./scaffold');

const config = {
  "project": {
    "name": "FAQ Bot",
    "language": "python",
    "framework": "langgraph"
  },
  "runtime": {
    "type": "fastapi",
    "port": 8000
  },
  "orchestration": {
    "style": "state-graph"
  },
  "agent": {
    "stages": ["retrieve", "reason", "act"],
    "subAgents": 0
  },
  "tools": {
    "selected": ["http_fetch", "calculator"]
  },
  "model": {
    "provider": "mock",
    "name": "mock-llm"
  },
  "storage": {
    "memory": "faiss-local",
    "cache": "in-memory",
    "sql": "sqlite"
  }
};

const scaffold = new ScaffoldingService();
await scaffold.generateProject(config, './my-agent-project');
```

## Project Structure

Generated projects follow this structure:

```
project-name/
├── src/
│   ├── nodes/              # Agent execution nodes
│   │   ├── retrieve/       # Each stage becomes a node
│   │   │   ├── logic.py    # Execution logic
│   │   │   └── prompts.py  # Prompt definitions
│   │   ├── reason/
│   │   └── act/
│   ├── main.py             # Application entry point
│   └── config.py           # Configuration management
├── tests/                  # Test files
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## Configuration Schema

### Project Configuration
- `name`: Human-readable project name
- `language`: `python` or `typescript`
- `framework`: `base`, `langchain`, or `langgraph`

### Runtime Configuration
- `type`: `fastapi` (Python), `express` (JS/TS), `cli`, or `worker`
- `port`: Optional port number (defaults: 8000 for FastAPI, 3000 for Express)

### Orchestration Configuration
- `style`: `pipeline` (sequential), `router` (branching), or `state-graph` (LangGraph)

### Agent Configuration
- `stages`: Array of pipeline stages (default: `['retrieve','reason','act']`)
- `subAgents`: Number of helper agents (default: 0)

### Tools Configuration
- `selected`: Array of tool names from: `['http_fetch','web_search','calculator','file_io','code_run']`

### Model Configuration

**Option 1: Single Model (Legacy)**
- `provider`: `mock` (offline default) or `ollama` (local models)
- `name`: Model identifier (e.g., `mock-llm`, `llama3.1`)

**Option 2: Multiple Models per Node (New)**
- `llm_nodes`: Array of node-specific model configurations
  - `node_name`: Name of the agent stage (e.g., "retrieve", "reason", "act")
  - `model`: Model configuration object
    - `provider`: Model provider (e.g., "openai", "ollama", "mock")
    - `name`: Model identifier (e.g., "gpt-4", "llama3.1", "mock-llm")

### Storage Configuration
- `memory`: Vector storage (`faiss-local` or `none`)
- `cache`: Cache layer (`in-memory` or `redis`)
- `sql`: SQL database (`sqlite` or `none`)

## Language Support

### Python
- **Runtimes**: FastAPI, CLI, Worker
- **Frameworks**: LangChain, LangGraph, Base
- **Features**: Async support, type hints, proper error handling

### JavaScript/TypeScript
- **Runtimes**: Express, CLI, Worker
- **Frameworks**: LangChain, LangGraph, Base
- **Features**: ES6+ syntax, proper module structure

## Handit Integration

Every generated project includes:

- **Automatic instrumentation**: All nodes are pre-configured with Handit tracing
- **Environment setup**: Handit API key configuration
- **Monitoring**: Built-in logging and error tracking
- **Dashboard integration**: Ready for Handit.ai dashboard

## Customization

After generation, customize your agent by:

1. **Editing node logic**: Modify `src/nodes/*/logic.*` files
2. **Updating prompts**: Customize `src/nodes/*/prompts.*` files
3. **Adding tools**: Implement additional tools in the tools directory
4. **Configuring models**: Update model settings in configuration files

## Best Practices

Generated projects follow these best practices:

- **Modular architecture**: Each node is independent and testable
- **Error handling**: Comprehensive error handling and logging
- **Configuration management**: Environment-based configuration
- **Testing structure**: Pre-configured test directories
- **Documentation**: Comprehensive README and inline documentation
- **Security**: Proper secret management and validation

## Development

To extend the scaffolding service:

1. **Add new templates**: Create templates in `python/templates/` or `js/templates/`
2. **Create generators**: Implement generators in `python/generators/` or `js/generators/`
3. **Update processors**: Modify the main processor in `index.js`

## Examples

### Single Model Configuration (Legacy)
```json
{
  "project": {
    "name": "FAQ Bot",
    "language": "python",
    "framework": "langgraph"
  },
  "runtime": {
    "type": "fastapi",
    "port": 8000
  },
  "orchestration": {
    "style": "state-graph"
  },
  "agent": {
    "stages": ["retrieve", "reason", "act"],
    "subAgents": 0
  },
  "tools": {
    "selected": ["http_fetch", "calculator"]
  },
  "model": {
    "provider": "mock",
    "name": "mock-llm"
  },
  "storage": {
    "memory": "faiss-local",
    "cache": "in-memory",
    "sql": "sqlite"
  }
}
```

### Multiple Models per Node Configuration (New)
```json
{
  "project": {
    "name": "Multi-Model Agent",
    "language": "python",
    "framework": "langgraph"
  },
  "runtime": {
    "type": "fastapi",
    "port": 8000
  },
  "orchestration": {
    "style": "state-graph"
  },
  "agent": {
    "stages": ["retrieve", "reason", "act"],
    "subAgents": 0
  },
  "tools": {
    "selected": ["http_fetch", "calculator", "web_search"]
  },
  "llm_nodes": [
    {
      "node_name": "retrieve",
      "model": {
        "provider": "ollama",
        "name": "llama3.1"
      }
    },
    {
      "node_name": "reason",
      "model": {
        "provider": "openai",
        "name": "gpt-4"
      }
    },
    {
      "node_name": "act",
      "model": {
        "provider": "mock",
        "name": "mock-llm"
      }
    }
  ],
  "storage": {
    "memory": "faiss-local",
    "cache": "redis",
    "sql": "sqlite"
  }
}
```

See the `examples/` directory for more sample configurations and generated projects.
