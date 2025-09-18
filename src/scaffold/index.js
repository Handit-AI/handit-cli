const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Main scaffolding service that generates agent projects based on JSON configuration
 */
class ScaffoldingService {
  constructor() {
    this.projectRoot = process.cwd();
    this.templatesPath = path.join(__dirname);
  }

  /**
   * Process JSON configuration and generate project structure
   * @param {Object} config - The JSON configuration object
   * @param {string} outputPath - Where to generate the project
   */
  async generateProject(config, outputPath = null) {
    try {
      console.log(chalk.blue.bold('\n🏗️  Handit Agent Scaffolding Service'));
      console.log(chalk.gray('Generating project structure based on configuration...\n'));

      // Validate configuration
      this.validateConfig(config);

      // Set output path
      const targetPath = outputPath || path.join(this.projectRoot, config.project.name.toLowerCase().replace(/\s+/g, '-'));

      // Create project directory
      await fs.ensureDir(targetPath);

      // Generate project structure based on language
      if (config.project.language === 'python') {
        await this.generatePythonProject(config, targetPath);
      } else if (config.project.language === 'typescript') {
        await this.generateJavaScriptProject(config, targetPath);
      } else {
        throw new Error(`Unsupported language: ${config.project.language}`);
      }

      // Generate README and configuration files
      await this.generateProjectFiles(config, targetPath);

      console.log(chalk.green.bold('\n✅ Project generated successfully!'));
      console.log(chalk.gray(`📁 Project location: ${targetPath}`));
      console.log(chalk.yellow('\n📋 Next steps:'));
      console.log(chalk.white('1. cd into the project directory'));
      console.log(chalk.white('2. Install dependencies'));
      console.log(chalk.white('3. Set up your environment variables'));
      console.log(chalk.white('4. Customize the prompts and logic in each node'));
      console.log(chalk.white('5. Run your agent!'));

      return targetPath;
    } catch (error) {
      console.error(chalk.red(`❌ Error generating project: ${error.message}`));
      throw error;
    }
  }

  /**
   * Validate the JSON configuration
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    const required = ['project', 'runtime', 'orchestration', 'agent', 'tools', 'storage'];
    
    for (const section of required) {
      if (!config[section]) {
        throw new Error(`Missing required section: ${section}`);
      }
    }

    // Validate project section
    if (!config.project.name || !config.project.language || !config.project.framework) {
      throw new Error('Project section must include: name, language, framework');
    }

    // Validate supported values
    const supportedLanguages = ['python', 'typescript'];
    if (!supportedLanguages.includes(config.project.language)) {
      throw new Error(`Unsupported language: ${config.project.language}. Supported: ${supportedLanguages.join(', ')}`);
    }

    const supportedFrameworks = ['base', 'langchain', 'langgraph'];
    if (!supportedFrameworks.includes(config.project.framework)) {
      throw new Error(`Unsupported framework: ${config.project.framework}. Supported: ${supportedFrameworks.join(', ')}`);
    }

    // Validate LLM nodes (new structure) or model (legacy structure)
    if (config.llm_nodes) {
      if (!Array.isArray(config.llm_nodes)) {
        throw new Error('llm_nodes must be an array');
      }
      for (const node of config.llm_nodes) {
        if (!node.node_name || !node.model) {
          throw new Error('Each llm_node must have node_name and model properties');
        }
        if (!node.model.provider || !node.model.name) {
          throw new Error('Each llm_node.model must have provider and name properties');
        }
      }
    } else if (config.model) {
      // Legacy model structure
      if (!config.model.provider || !config.model.name) {
        throw new Error('Model section must include: provider, name');
      }
    } else {
      throw new Error('Must include either llm_nodes or model section');
    }

    console.log(chalk.green('✅ Configuration validated successfully'));
  }

  /**
   * Generate Python project structure
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generatePythonProject(config, targetPath) {
    console.log(chalk.blue('🐍 Generating Python project structure...'));

    // Import Python generators
    const PythonGenerator = require('./python/generators/base');
    const LangChainGenerator = require('./python/generators/langchain');
    const LangGraphGenerator = require('./python/generators/langgraph');

    // Create main project structure
    await this.createPythonProjectStructure(config, targetPath);

    // Generate based on framework
    switch (config.project.framework) {
      case 'langchain':
        await LangChainGenerator.generate(config, targetPath);
        break;
      case 'langgraph':
        await LangGraphGenerator.generate(config, targetPath);
        break;
      default:
        await PythonGenerator.generate(config, targetPath);
    }

    console.log(chalk.green('✅ Python project structure created'));
  }

  /**
   * Generate JavaScript/TypeScript project structure
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generateJavaScriptProject(config, targetPath) {
    console.log(chalk.blue('🟨 Generating JavaScript/TypeScript project structure...'));

    // Import JS generators
    const JSGenerator = require('./js/generators/base');
    const LangChainGenerator = require('./js/generators/langchain');
    const LangGraphGenerator = require('./js/generators/langgraph');

    // Create main project structure
    await this.createJavaScriptProjectStructure(config, targetPath);

    // Generate based on framework
    switch (config.project.framework) {
      case 'langchain':
        await LangChainGenerator.generate(config, targetPath);
        break;
      case 'langgraph':
        await LangGraphGenerator.generate(config, targetPath);
        break;
      default:
        await JSGenerator.generate(config, targetPath);
    }

    console.log(chalk.green('✅ JavaScript/TypeScript project structure created'));
  }

  /**
   * Create base Python project structure
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async createPythonProjectStructure(config, targetPath) {
    const structure = [
      'src/',
      'src/nodes/',
      'tests/',
      'requirements.txt',
      '.env.example',
      '.gitignore',
      'README.md'
    ];

    // Create directories
    for (const dir of structure.filter(item => item.endsWith('/'))) {
      await fs.ensureDir(path.join(targetPath, dir));
    }

    // Create node directories for each agent stage
    for (const stage of config.agent.stages) {
      await fs.ensureDir(path.join(targetPath, 'src/nodes', stage));
    }
  }

  /**
   * Create base JavaScript project structure
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async createJavaScriptProjectStructure(config, targetPath) {
    const structure = [
      'src/',
      'src/nodes/',
      'tests/',
      'package.json',
      '.env.example',
      '.gitignore',
      'README.md'
    ];

    // Create directories
    for (const dir of structure.filter(item => item.endsWith('/'))) {
      await fs.ensureDir(path.join(targetPath, dir));
    }

    // Create node directories for each agent stage
    for (const stage of config.agent.stages) {
      await fs.ensureDir(path.join(targetPath, 'src/nodes', stage));
    }
  }

  /**
   * Generate common project files (README, .env, etc.)
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generateProjectFiles(config, targetPath) {
    console.log(chalk.blue('📄 Generating project files...'));

    // Generate README
    await this.generateREADME(config, targetPath);

    // Generate environment file
    await this.generateEnvFile(config, targetPath);

    // Generate gitignore
    await this.generateGitignore(config, targetPath);

    console.log(chalk.green('✅ Project files generated'));
  }

  /**
   * Generate project README
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generateREADME(config, targetPath) {
    const readmeContent = `# ${config.project.name}

A Handit-powered AI agent built with ${config.project.framework} and ${config.project.language}.

## Project Structure

\`\`\`
src/
├── nodes/           # Agent execution nodes
│   ├── ${config.agent.stages.join('/')}/
│   │   ├── logic.${config.project.language === 'python' ? 'py' : 'js'}    # Node execution logic
│   │   └── prompts.${config.project.language === 'python' ? 'py' : 'js'}   # Prompt definitions
├── main.${config.project.language === 'python' ? 'py' : 'js'}             # Main application entry
└── config.${config.project.language === 'python' ? 'py' : 'js'}          # Configuration
\`\`\`

## Features

- **Runtime**: ${config.runtime.type}
- **Framework**: ${config.project.framework}
- **Orchestration**: ${config.orchestration.style}
- **Tools**: ${config.tools.selected.join(', ')}
- **Model**: ${config.model ? `${config.model.provider}/${config.model.name}` : 'Multiple models per node'}
- **Storage**: ${config.storage.memory}/${config.storage.cache}/${config.storage.sql}

## Setup

1. Install dependencies:
   \`\`\`bash
   ${config.project.language === 'python' ? 'pip install -r requirements.txt' : 'npm install'}
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Run the agent:
   \`\`\`bash
   ${config.project.language === 'python' ? 'python main.py' : 'npm start'}
   \`\`\`

## Customization

Each node in \`src/nodes/\` contains:
- \`logic.*\`: The execution logic for the node
- \`prompts.*\`: Prompt definitions and templates

Edit these files to customize your agent's behavior.

## Handit Integration

This project is pre-configured with Handit.ai monitoring. Set your \`HANDIT_API_KEY\` environment variable to enable tracing and monitoring.

## Documentation

- [Handit.ai Documentation](https://docs.handit.ai)
- [${config.project.framework} Documentation](https://docs.${config.project.framework}.com)
`;

    await fs.writeFile(path.join(targetPath, 'README.md'), readmeContent);
  }

  /**
   * Generate environment configuration file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generateEnvFile(config, targetPath) {
    const envContent = `# Handit.ai Configuration
HANDIT_API_KEY=your_handit_api_key_here

# Model Configuration
MODEL_PROVIDER=${config.model ? config.model.provider : 'mock'}
MODEL_NAME=${config.model ? config.model.name : 'mock-llm'}

# LLM Nodes Configuration (if using new structure)
${config.llm_nodes ? config.llm_nodes.map(node => `# ${node.node_name}: ${node.model.provider}/${node.model.name}`).join('\n') : ''}

# Runtime Configuration
${config.runtime.type === 'fastapi' ? `PORT=${config.runtime.port || 8000}` : ''}
${config.runtime.type === 'express' ? `PORT=${config.runtime.port || 3000}` : ''}

# Storage Configuration
MEMORY_STORAGE=${config.storage.memory}
CACHE_STORAGE=${config.storage.cache}
SQL_STORAGE=${config.storage.sql}

# Add your custom environment variables below
`;

    await fs.writeFile(path.join(targetPath, '.env.example'), envContent);
  }

  /**
   * Generate gitignore file
   * @param {Object} config - Configuration object
   * @param {string} targetPath - Target directory path
   */
  async generateGitignore(config, targetPath) {
    const gitignoreContent = `# Environment variables
.env
.env.local
.env.production

# Dependencies
${config.project.language === 'python' ? 'node_modules/\n__pycache__/\n*.pyc\n*.pyo\n*.pyd\n.Python\nenv/\nvenv/\n.venv/' : 'node_modules/\n.npm'}

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Runtime
${config.storage.sql === 'sqlite' ? '*.db\n*.sqlite' : ''}
${config.storage.memory === 'faiss-local' ? '*.faiss\n*.pkl' : ''}

# Build outputs
dist/
build/
*.egg-info/
`;

    await fs.writeFile(path.join(targetPath, '.gitignore'), gitignoreContent);
  }
}

module.exports = { ScaffoldingService };
