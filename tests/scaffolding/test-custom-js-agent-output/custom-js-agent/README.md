# Custom JS Agent

A Handit-powered AI agent built with langgraph and javascript.

## Project Structure

```
src/
├── nodes/           # Agent execution nodes
│   ├── llm_1/llm_2/llm_3/
│   │   ├── logic.js    # Node execution logic
│   │   └── prompts.js   # Prompt definitions
├── main.js             # Main application entry
└── config.js          # Configuration
```

## Features

- **Runtime**: express
- **Framework**: langgraph
- **Orchestration**: state-graph
- **Tools**: Node-specific tools
- **Model**: Multiple models per node
- **Storage**: none/in-memory/none

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run the agent:
   ```bash
   npm start
   ```

## Customization

Each node in `src/nodes/` contains:
- `logic.*`: The execution logic for the node
- `prompts.*`: Prompt definitions and templates

Edit these files to customize your agent's behavior.

## Handit Integration

This project is pre-configured with Handit.ai monitoring. Set your `HANDIT_API_KEY` environment variable to enable tracing and monitoring.

## Documentation

- [Handit.ai Documentation](https://docs.handit.ai)
- [langgraph Documentation](https://docs.langgraph.com)
