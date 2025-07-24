# Handit CLI

A CLI tool for setting up Handit agent monitoring with trace-based evaluation and optimization.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Make the CLI executable
chmod +x bin/handit-cli.js
```

### Testing the CLI

#### 1. Local Development Testing

```bash
# Test the setup command
npm start

# Test with development mode
npm run dev

# Test with non-interactive mode
npm start -- --yes

# Test with specific file and function
npm start -- --file index.js --entry main
```

#### 2. Link for Global Testing

```bash
# Link the package globally
npm link

# Test as a global command
handit-cli setup

# Test monitor command
handit-cli monitor

# Test evaluate command
handit-cli evaluate
```

#### 3. Test with Sample Projects

Create a test project to verify language detection:

```bash
# Create a JavaScript test project
mkdir test-js-project
cd test-js-project
echo '{"name": "test"}' > package.json
echo 'function main() { console.log("Hello"); }' > index.js

# Test setup
handit-cli setup --yes

# Test monitor (generates mock traces)
handit-cli monitor

# Test evaluate (analyzes traces)
handit-cli evaluate
```

## 📁 Project Structure

```
handit-cli/
├── bin/handit-cli.js        # CLI entry point
├── src/
│   ├── index.js             # Main CLI logic
│   ├── setup/               # Language detection & prompts
│   ├── parser/              # AST parsing & call graph
│   ├── analyzer/            # Function analysis
│   ├── confirm/             # User confirmation UI
│   ├── generator/           # Code instrumentation
│   ├── monitor/             # Trace collection
│   ├── evaluate/            # Trace analysis & suggestions
│   └── config/              # Configuration management
└── package.json
```

## 🎯 Workflow

### 1. Setup (`handit-cli setup`)
- Detect project language (JavaScript/Python)
- Analyze function call graph
- Identify functions to track
- Instrument code with Handit
- Write configuration

### 2. Monitor (`handit-cli monitor`)
- Collect execution traces from agent
- Monitor function calls and performance
- Save traces to JSON file
- Real-time monitoring with timeout

### 3. Evaluate (`handit-cli evaluate`)
- Analyze collected traces
- Identify performance bottlenecks
- Generate optimization suggestions
- Create evaluation report

## 🧪 Testing Strategy

### Unit Tests

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Integration Tests

1. **Setup Flow**: Test language detection and instrumentation
2. **Monitor Flow**: Test trace collection and file output
3. **Evaluate Flow**: Test trace analysis and suggestions
4. **End-to-End**: Test complete workflow

### Manual Testing Checklist

- [ ] CLI starts without errors
- [ ] Setup command works for JS/Python projects
- [ ] Monitor command generates trace files
- [ ] Evaluate command analyzes traces and suggests improvements
- [ ] All commands work in non-interactive mode
- [ ] Error handling works properly

## 🔧 Development

### Adding New Features

1. **Trace Collection**: Enhance `src/monitor/` for real trace collection
2. **Analysis Logic**: Improve `src/evaluate/` with more sophisticated analysis
3. **Instrumentation**: Add to `src/generator/` for better code modification
4. **Parser Implementation**: Replace stubs in `src/parser/`

### Debugging

```bash
# Enable debug mode
npm start -- --dev

# Check for errors
npm run lint
```

## 📦 Publishing

```bash
# Build and test
npm run prepublishOnly

# Publish to npm
npm publish
```

## 🎯 Next Steps

1. **Real Trace Collection**: Implement actual function monitoring
2. **AI-Powered Analysis**: Integrate Claude for better suggestions
3. **Advanced Instrumentation**: Support more complex code patterns
4. **Performance Monitoring**: Add real-time performance tracking
5. **Integration Tests**: Comprehensive test coverage 