# Handit CLI

> **AI-Powered Agent Instrumentation & Monitoring CLI Tool**

[![npm version](https://badge.fury.io/js/handit-cli.svg)](https://badge.fury.io/js/handit-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Handit CLI is a powerful command-line tool that automatically instruments your AI agents with comprehensive tracing and monitoring capabilities. It uses AI to analyze your codebase, detect function call graphs, and generate instrumented code that provides deep insights into your agent's execution patterns.

## 🚀 Features

- **🤖 AI-Powered Analysis**: Uses GPT-4 to intelligently detect entry points and function relationships
- **🌳 Execution Tree Visualization**: Interactive tree view of your agent's function call hierarchy
- **📊 Automatic Instrumentation**: Generates production-ready instrumented code with Handit.ai tracing
- **🔍 Smart Language Detection**: Supports JavaScript/TypeScript and Python projects
- **🎯 Precise Function Detection**: Handles complex patterns like Express routes, FastAPI endpoints, and class methods
- **🔄 Interactive Workflow**: Step-by-step guided setup with user confirmation at each stage
- **🔐 Secure Authentication**: Browser-based authentication with Handit.ai dashboard
- **📈 Future-Ready**: Designed for upcoming monitoring and evaluation features

## 📦 Installation

### Quick Start (Recommended)

```bash
# Set up Handit instrumentation for your AI agent
npx @handit.ai/cli setup

# Connect your repository to Handit for automatic PR creation
npx @handit.ai/cli github
```

### Global Installation

```bash
npm install -g @handit.ai/cli
```

Then run:
```bash
handit-cli setup
```

## 🎯 Quick Start

1. **Navigate to your project directory**
   ```bash
   cd /path/to/your/agent-project
   ```

2. **Run the setup wizard**
   ```bash
   npx @handit.ai/cli setup
   ```

3. **Follow the interactive prompts**
   - Authenticate with Handit.ai
   - Confirm your agent's entry point (AI will help detect it)
   - Review the detected function tree
   - Approve code instrumentation

4. **Your agent is now instrumented and ready for monitoring!**

   The setup process has:
   - ✅ Analyzed your codebase
   - ✅ Generated instrumented code
   - ✅ Created Handit.ai configuration
   - ✅ Applied all changes to your files

## 📋 Commands

### `setup` - Initial Agent Setup

Sets up Handit instrumentation for your agent.

```bash
npx @handit.ai/cli setup
```

**Options:**
- `--test` - Use test environment (localhost)

**Examples:**
```bash
# Production setup
npx @handit.ai/cli setup

# Test with localhost  
npx @handit.ai/cli setup --test

# Connect repository to Handit for automatic PRs
npx @handit.ai/cli github

# Connect repository in test environment
npx @handit.ai/cli github --test
```

### 🔗 GitHub Integration

Connect your repository to Handit for automatic PR creation when new prompts are detected.

```bash
npx @handit.ai/cli github
```

**What it does:**
- Authenticates with your Handit account
- Detects your Git repository 
- Installs the Handit GitHub App for your repositories
- Enables automatic PR creation for prompt optimizations

**Requirements:**
- Git repository (any remote or no remote)
- GitHub account with repository access
- Handit account with company setup

### Coming Soon

The following commands are planned for future releases:

- **`monitor`** - Collect execution traces from your agent
- **`evaluate`** - Analyze traces and provide optimization insights

## 🔧 Supported Languages

### JavaScript/TypeScript

**Supported Patterns:**
- Express.js route handlers
- Async/await functions
- Arrow functions
- Class methods
- Function declarations

**Example Entry Point:**
```javascript
// Express route handler
app.post('/process-document', async (req, res) => {
  const result = await processDocument(req.body);
  res.json(result);
});

// Regular function
async function processDocument(data) {
  const result = await analyzeDocument(data);
  return result;
}
```

### Python

**Supported Patterns:**
- FastAPI endpoints
- Async functions
- Class methods
- Regular functions
- Decorators

**Example Entry Point:**
```python
# FastAPI endpoint
@app.post("/process-document")
async def process_document(request: DocumentRequest):
    result = await analyze_document(request.data)
    return result

# Class method
class DocumentProcessor:
    async def process_document(self, data):
        result = await self.analyze_document(data)
        return result
```

## 🏗️ Generated Code Examples

### JavaScript Instrumentation

**Before:**
```javascript
async function processDocument(data) {
  const result = await analyzeDocument(data);
  return result;
}
```

**After:**
```javascript
const { startTracing, trackNode, endTracing } = require('@handit.ai/node');

async function processDocument(data, executionId) {
  const tracingResponse = await trackNode({
    input: data,
    nodeName: 'processDocument',
    agentName: 'my-agent',
    nodeType: 'function',
    executionId
  });
  
  try {
    const result = await analyzeDocument(data, executionId);
    
    await trackNode({
      input: data,
      output: result,
      nodeName: 'processDocument',
      agentName: 'my-agent',
      nodeType: 'function',
      executionId
    });
    
    return result;
  } catch (error) {
    await trackNode({
      input: data,
      error: error.message,
      nodeName: 'processDocument',
      agentName: 'my-agent',
      nodeType: 'function',
      executionId
    });
    throw error;
  }
}
```

### Python Instrumentation

**Before:**
```python
async def process_document(data):
    result = await analyze_document(data)
    return result
```

**After:**
```python
from handit_service import tracker

async def process_document(data, execution_id=None):
    await tracker.track_node(
        input=data,
        node_name="process_document",
        agent_name="my-agent",
        node_type="function",
        execution_id=execution_id
    )
    
    try:
        result = await analyze_document(data, execution_id)
        
        await tracker.track_node(
            input=data,
            output=result,
            node_name="process_document",
            agent_name="my-agent",
            node_type="function",
            execution_id=execution_id
        )
        
        return result
    except Exception as e:
        await tracker.track_node(
            input=data,
            error=str(e),
            node_name="process_document",
            agent_name="my-agent",
            node_type="function",
            execution_id=execution_id
        )
        raise
```

## 🔐 Authentication

Handit CLI uses browser-based authentication for security:

1. **Run setup command**
   ```bash
   npx handit-cli setup
   ```

2. **Browser opens automatically** to Handit.ai dashboard

3. **Complete authentication** in your browser

4. **Copy CLI code** from the dashboard

5. **Paste the code** in the terminal

Your authentication tokens are securely stored locally and encrypted.

## 📊 What's Next

After setup, your agent is instrumented with Handit.ai tracing. The following features are coming soon:

### Trace Collection (Coming Soon)
```bash
# Start monitoring for 10 minutes
npx @handit.ai/cli monitor --timeout 600

# Monitor in development mode
npx @handit.ai/cli monitor --dev
```

### Trace Analysis (Coming Soon)
```bash
# Analyze collected traces
npx @handit.ai/cli evaluate --traces traces.json

# Generate detailed report
npx @handit.ai/cli evaluate --output detailed-analysis.json
```

## 🛠️ Configuration

### Environment Variables

```bash
# Required for AI-powered analysis
export OPENAI_API_KEY="your-openai-api-key"

# Handit.ai API key (auto-configured during setup)
export HANDIT_API_KEY="your-handit-api-key"
```

### Configuration Files

**handit.config.json** (auto-generated):
```json
{
  "agentName": "my-document-processor",
  "entryFile": "server.js",
  "entryFunction": "processDocument",
  "language": "javascript",
  "projectRoot": "/path/to/project"
}
```

## 🏗️ Project Structure

After setup, your project will include:

```
your-project/
├── handit.config.json          # Configuration file
├── handit_service.js           # JavaScript service (auto-generated)
├── handit_service.py           # Python service (auto-generated)
├── server.js                   # Your instrumented entry point
└── services/
    └── documentProcessor.js    # Instrumented functions
```

## 🔍 Troubleshooting

### Common Issues

**"Authentication required"**
- Run `npx @handit.ai/cli setup` and complete browser authentication

**"Could not detect entry point"**
- The AI will help you find the correct entry point interactively

**"No functions detected"**
- Ensure your entry function calls other functions
- Check that functions are properly exported/imported

**"OpenAI API key missing"**
- Set environment variable: `export OPENAI_API_KEY="your-key"`

### Debug Mode

```bash
# Enable verbose logging
DEBUG=@handit.ai/cli:* npx @handit.ai/cli setup
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/handit/handit-cli.git
cd handit-cli
npm install
npm run dev
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.handit.ai](https://docs.handit.ai)
- **Issues**: [GitHub Issues](https://github.com/handit/handit-cli/issues)
- **Discord**: [Join our community](https://discord.gg/handit)
- **Email**: support@handit.ai

## 🙏 Acknowledgments

- Built with [OpenAI GPT-4](https://openai.com) for intelligent code analysis
- Powered by [Handit.ai](https://handit.ai) for agent monitoring
- Inspired by the need for better AI agent observability

---

**Made with ❤️ by the Handit Team**

[Website](https://handit.ai) • [Twitter](https://twitter.com/handit_ai) • [GitHub](https://github.com/handit) 