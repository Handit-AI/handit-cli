# Scaffolding Service Tests

This directory contains comprehensive tests for the Handit Agent Scaffolding Service.

## Test Files

### Core Tests

- **`test-scaffolding.js`** - Standard scaffolding tests with all framework combinations
- **`test-new-structure.js`** - Tests for new node-based tools and llm_nodes structure  
- **`test-ultra-simple.js`** - Tests for minimal configurations with maximum defaults

### Test Runner

- **`run-all-tests.js`** - Comprehensive test runner that executes all scaffolding tests

## Running Tests

### Run All Tests
```bash
cd tests/scaffolding
node run-all-tests.js
```

### Run Individual Tests
```bash
# Standard scaffolding tests
node test-scaffolding.js

# New node-based structure tests
node test-new-structure.js

# Ultra-simplified configuration tests
node test-ultra-simple.js
```

## Test Coverage

### Framework Coverage
- ✅ **Base Framework**: Python and JavaScript
- ✅ **LangChain**: Python and JavaScript
- ✅ **LangGraph**: Python and JavaScript

### Configuration Coverage
- ✅ **Full Configuration**: All sections specified
- ✅ **Minimal Configuration**: Only required sections
- ✅ **Default Configuration**: Maximum use of intelligent defaults
- ✅ **Node-Based Configuration**: New tools and llm_nodes structure
- ✅ **Legacy Configuration**: Backward compatibility

### Language Coverage
- ✅ **Python**: All frameworks and runtime types
- ✅ **TypeScript**: All frameworks and runtime types

### Runtime Coverage
- ✅ **FastAPI**: Python web applications
- ✅ **Express**: TypeScript web applications
- ✅ **CLI**: Command-line tools
- ✅ **Worker**: Background processing

### Storage Coverage
- ✅ **Base**: Minimal storage (none/in-memory/none)
- ✅ **LangChain**: Vector storage (faiss-local/in-memory/none)
- ✅ **LangGraph**: State management (none/in-memory/none)

## Expected Outputs

Each test generates complete AI agent projects in the `test-*-output/` directories with:

- ✅ **Project Structure**: Proper directory organization
- ✅ **Configuration Files**: Type-safe configuration management
- ✅ **Node Implementation**: Logic and prompt files for each stage
- ✅ **Documentation**: README files in every folder
- ✅ **Dependencies**: Proper package.json/requirements.txt
- ✅ **Environment Setup**: Complete .env.example files
- ✅ **Handit Integration**: Proper tracing implementation

## Quality Checks

Each test verifies:

- ✅ **Syntax Validation**: All generated files compile without errors
- ✅ **Configuration Validation**: All defaults are properly applied
- ✅ **Structure Validation**: Proper project organization
- ✅ **Documentation Validation**: README files are generated
- ✅ **Tracing Validation**: Handit integration is correct

## Test Results

All tests should pass with:
- **Python files**: Compile without syntax errors
- **JavaScript files**: Valid syntax and structure
- **Configuration**: Proper defaults and validation
- **Documentation**: Complete README coverage
- **Integration**: Correct Handit tracing implementation

## Troubleshooting

If tests fail:

1. **Check Dependencies**: Ensure all required packages are installed
2. **Check File Permissions**: Ensure write permissions for test output directories
3. **Check Syntax**: Run individual file syntax checks
4. **Check Configuration**: Verify configuration validation logic
5. **Check Logs**: Review test output for specific error messages

## Contributing

When adding new features to the scaffolding service:

1. **Add Tests**: Create tests for new functionality
2. **Update Coverage**: Ensure all code paths are tested
3. **Verify Quality**: Run all tests before committing
4. **Update Documentation**: Update README files as needed
