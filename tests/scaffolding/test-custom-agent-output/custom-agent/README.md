# Custom Agent

A Handit-powered AI agent built with langgraph and python.

## Project Structure

```
src/
├── nodes/           # Agent execution nodes
│   ├── llm_1/llm_2/llm_3/
│   │   ├── logic.py    # Node execution logic
│   │   └── prompts.py   # Prompt definitions
├── main.py             # Main application entry
└── config.py          # Configuration
```

## Features

- **Runtime**: fastapi
- **Framework**: langgraph
- **Orchestration**: state-graph
- **Tools**: Node-specific tools
- **Model**: Multiple models per node
- **Storage**: none/in-memory/none

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Run the agent:
   ```bash
   python main.py
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
