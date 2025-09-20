/**
 * Modular Ink AI Project Creation Wizard using component architecture
 */
const React = require('react');
const path = require('path');
const fs = require('fs-extra');

async function showModularAgenticCreateWizard(config) {
  const { render } = await import('ink');
  const { Box, Text, useInput } = await import('ink');

  // Import the components
  const { WelcomeHeaderScaffolding } = require('./components/WelcomeHeaderScaffolding');
  const { ProjectNameStep } = require('./components/ProjectNameStep');
  const { CodeLanguageStep } = require('./components/CodeLanguageStep');
  const { AgentStep } = require('./components/AgentStep');
  const { ToolsStep } = require('./components/ToolsStep');
  const { ModelStep } = require('./components/ModelStep');
  const { ProjectSuccessClosing } = require('./components/ProjectSuccessClosing');

  return new Promise((resolve, reject) => {
    function ModularAICreateWizard() {
      // State management - expanded to include steps 1, 2, 3, 4, and 5
      const [currentStep, setCurrentStep] = React.useState(1);
      const [projectName, setProjectName] = React.useState('');
      const [codeLanguage, setCodeLanguage] = React.useState('');
      const [selectedLanguageIndex, setSelectedLanguageIndex] = React.useState(0);
      const [llmNodes, setLlmNodes] = React.useState('');
      const [tools, setTools] = React.useState('');
      const [llmProvider, setLlmProvider] = React.useState('');
      const [error, setError] = React.useState(null);
      const [projectCreated, setProjectCreated] = React.useState(false);
      const [projectPath, setProjectPath] = React.useState('');
      
      const languages = ['Python', 'JavaScript'];
      
      // Input handling - for steps 1, 2, 3, 4, and 5
      useInput((input, key) => {
        // Handle Ctrl+C to cancel
        if (key.ctrl && input === 'c') {
          reject(new Error('AI project creation cancelled by user'));
          return;
        }
        
        // Handle success step - Enter to exit
        if (projectCreated && key.return) {
          resolve({
            projectName: projectName,
            codeLanguage: codeLanguage,
            llmNodes: llmNodes,
            tools: tools,
            llmProvider: llmProvider,
            configGenerated: true,
            scaffoldingCompleted: true,
            projectPath: projectPath
          });
        }

        // Handle project name input (step 1)
        if (currentStep === 1) {
          if (key.return) {
            // Move to language selection if project name is provided
            if (projectName.trim()) {
              setCurrentStep(2); // Move to language selection step
            }
          } else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            // Handle backspace
            setProjectName(projectName.slice(0, -1));
          } else if (input && input.length > 0) {
            // Handle regular input
            let processedInput = input;
            
            // Clean input - remove newlines and quotes
              if (input.includes('\n') || input.includes('\r')) {
                const lines = input.split(/[\n\r]+/).filter(line => line.trim());
                if (lines.length > 0) {
                processedInput = lines[0].trim();
              }
            }
            
            // Remove quotes if present
            if ((processedInput.startsWith('"') && processedInput.endsWith('"')) ||
                (processedInput.startsWith("'") && processedInput.endsWith("'"))) {
              processedInput = processedInput.slice(1, -1);
            }
            
            setProjectName(projectName + processedInput);
          }
        }

        // Handle language selection (step 2)
        if (currentStep === 2) {
          if (key.upArrow && selectedLanguageIndex > 0) {
            setSelectedLanguageIndex(selectedLanguageIndex - 1);
          } else if (key.downArrow && selectedLanguageIndex < languages.length - 1) {
            setSelectedLanguageIndex(selectedLanguageIndex + 1);
          } else if (key.return) {
            // Select language and move to LLM nodes step
            setCodeLanguage(languages[selectedLanguageIndex]);
            setCurrentStep(3); // Move to LLM nodes step
          }
        }

        // Handle LLM nodes input (step 3)
        if (currentStep === 3) {
          if (key.return) {
            // Move to tools step if LLM nodes provided
            if (llmNodes.trim()) {
              setCurrentStep(4); // Move to tools step
            }
          } else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            // Handle backspace
            setLlmNodes(llmNodes.slice(0, -1));
          } else if (input && input.length > 0) {
            // Handle regular input
            let processedInput = input;
            
            // Clean input - remove newlines and quotes
            if (input.includes('\n') || input.includes('\r')) {
              const lines = input.split(/[\n\r]+/).filter(line => line.trim());
              if (lines.length > 0) {
                processedInput = lines[0].trim();
              }
            }
            
            // Remove quotes if present
            if ((processedInput.startsWith('"') && processedInput.endsWith('"')) ||
                (processedInput.startsWith("'") && processedInput.endsWith("'"))) {
              processedInput = processedInput.slice(1, -1);
            }
            
            setLlmNodes(llmNodes + processedInput);
          }
        }

        // Handle tools input (step 4)
        if (currentStep === 4) {
          if (key.return) {
            // Move to LLM provider step if tools provided
            if (tools.trim()) {
              setCurrentStep(5); // Move to LLM provider step
            }
          } else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            // Handle backspace
            setTools(tools.slice(0, -1));
          } else if (input && input.length > 0) {
            // Handle regular input
            let processedInput = input;
            
            // Clean input - remove newlines and quotes
            if (input.includes('\n') || input.includes('\r')) {
              const lines = input.split(/[\n\r]+/).filter(line => line.trim());
              if (lines.length > 0) {
                processedInput = lines[0].trim();
              }
            }
            
            // Remove quotes if present
            if ((processedInput.startsWith('"') && processedInput.endsWith('"')) ||
                (processedInput.startsWith("'") && processedInput.endsWith("'"))) {
              processedInput = processedInput.slice(1, -1);
            }
            
            setTools(tools + processedInput);
          }
        }

        // Handle LLM provider input (step 5)
        if (currentStep === 5) {
          if (key.return) {
            // Complete wizard with LLM provider
            if (llmProvider.trim()) {
              // Generate JSON configuration
              setTimeout(async () => {
                try {
                  const projectNameSafe = (projectName || 'my-ai-project').trim();
                  const codeLanguageSafe = (codeLanguage || 'Python').toLowerCase().replace('typescript/javascript', 'javascript');
                  const llmNodesSafe = llmNodes.trim() || 'reason, act, assistant_composer';
                  const toolsSafe = tools.trim() || 'http_fetch, web_search, calculator';
                  const llmProviderSafe = llmProvider.trim() || 'ChatGPT';
                  
                  // Parse comma-separated values and clean them
                  const parsedLlmNodes = llmNodesSafe.split(',').map(node => node.trim()).filter(node => node.length > 0);
                  const parsedTools = toolsSafe.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
                  
                  // Create JSON structure matching the specified format
                  const configData = {
                    "project": {
                      "name": projectNameSafe,
                      "language": codeLanguageSafe,
                      "default_llm_provider": llmProviderSafe.toLowerCase()
                    },
                    "agent": {
                      "stages": parsedLlmNodes,
                      "subAgents": 0
                    },
                    "tools": parsedTools.map(toolName => ({
                      "node_name": toolName.toLowerCase().replace(/\s+/g, '_'),
                      "selected": [toolName.toLowerCase().replace(/\s+/g, '_')]
                    })),
                    "llm_nodes": parsedLlmNodes.map(nodeName => ({
                      "node_name": nodeName.toLowerCase().replace(/\s+/g, '_'),
                      "model": {
                        "provider": llmProviderSafe.toLowerCase(),
                        "name": "gpt-4"
                      }
                    }))
                  };
                  
                  // Execute scaffolding after config generation (no file saving)
                  try {
                    const { ScaffoldingService } = require('../scaffold/index.js');
                    const scaffoldingService = new ScaffoldingService();
                    
                    // Create target directory path
                    const targetPath = path.join(process.cwd(), projectNameSafe.toLowerCase().replace(/\s+/g, '-'));
                    
                    // Generate the project
                    await scaffoldingService.generateProject(configData, targetPath);
                    
                    // Set success state instead of resolving immediately
                    setProjectPath(targetPath);
                    setProjectCreated(true);
                  } catch (scaffoldingError) {
                    // Still resolve with config generation success
                    resolve({
                      projectName: projectNameSafe,
                      codeLanguage: codeLanguageSafe,
                      llmNodes: llmNodesSafe,
                      tools: toolsSafe,
                      llmProvider: llmProviderSafe,
                      configGenerated: true,
                      scaffoldingCompleted: false,
                      scaffoldingError: scaffoldingError.message
                    });
                  }
                } catch (error) {
                  // Still resolve but without config generation
                  resolve({
                    projectName: projectName || 'my-ai-project',
                    codeLanguage: (codeLanguage || 'Python').toLowerCase().replace('typescript/javascript', 'javascript'),
                    llmNodes: llmNodes.trim(),
                    tools: tools.trim(),
                    llmProvider: llmProvider.trim(),
                    configGenerated: false,
                    error: error.message
                  });
                }
              }, 100);
            }
          } else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            // Handle backspace
            setLlmProvider(llmProvider.slice(0, -1));
          } else if (input && input.length > 0) {
            // Handle regular input
            let processedInput = input;
            
            // Clean input - remove newlines and quotes
            if (input.includes('\n') || input.includes('\r')) {
              const lines = input.split(/[\n\r]+/).filter(line => line.trim());
              if (lines.length > 0) {
                processedInput = lines[0].trim();
              }
            }
            
            // Remove quotes if present
            if ((processedInput.startsWith('"') && processedInput.endsWith('"')) ||
                (processedInput.startsWith("'") && processedInput.endsWith("'"))) {
              processedInput = processedInput.slice(1, -1);
            }
            
            setLlmProvider(llmProvider + processedInput);
          }
        }
      });


        // Get current input value for cursor
        const getCurrentValue = () => {
          if (currentStep === 1) return projectName;
          if (currentStep === 3) return llmNodes;
          if (currentStep === 4) return tools;
          if (currentStep === 5) return llmProvider;
          return '';
        };

      const displayValue = getCurrentValue();

      return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
        // Header (always visible)
        React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center' }, 
          WelcomeHeaderScaffolding(React, Text)
        ),
        
        // Step 1: Project Name (show when on step 1 or when completed)
        (currentStep === 1 || (currentStep > 1 && projectName)) ? React.createElement(Box, { key: 'project-name-step' },
          ProjectNameStep(React, Box, Text, {
            projectName: projectName || 'my-ai-project',
            onInput: setProjectName,
            currentValue: displayValue,
            isCompleted: currentStep > 1 && projectName
          })
        ) : null,
        
        // Step 2: Code Language (show when on step 2 or when completed)
        (currentStep === 2 || (currentStep > 2 && codeLanguage)) ? React.createElement(Box, { key: 'code-language-step' },
          CodeLanguageStep(React, Box, Text, {
            codeLanguage: codeLanguage || 'python',
            selectedIndex: selectedLanguageIndex,
            isCompleted: currentStep > 2 && codeLanguage
          })
        ) : null,
        
        // Step 3: LLM Nodes (show when on step 3 or when completed)
        (currentStep === 3 || (currentStep > 3 && llmNodes)) ? React.createElement(Box, { key: 'llm-nodes-step' },
          AgentStep(React, Box, Text, {
            llmNodes: llmNodes,
            currentValue: displayValue,
            isCompleted: currentStep > 3 && llmNodes
          })
        ) : null,
        
        // Step 4: Tools (show when on step 4 or when completed)
        (currentStep === 4 || (currentStep > 4 && tools)) ? React.createElement(Box, { key: 'tools-step' },
          ToolsStep(React, Box, Text, {
            tools: tools,
            currentValue: displayValue,
            isCompleted: currentStep > 4 && tools
          })
        ) : null,
        
        // Step 5: LLM Provider (show when on step 5)
        currentStep === 5 ? React.createElement(Box, { key: 'llm-provider-step' },
          ModelStep(React, Box, Text, {
            llmProvider: llmProvider,
            currentValue: displayValue,
            isCompleted: false
          })
        ) : null,
        
        // Success Step: Show when project is created
        projectCreated ? React.createElement(Box, { key: 'success-step', marginTop: 2 }, 
          ProjectSuccessClosing(React, Box, Text, projectName || 'my-ai-project', projectPath)
        ) : null,
        
        // Error message
        error ? React.createElement(Box, { key: 'error', marginTop: 2 }, [
          React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
        ]) : null,
        
        // Instructions (don't show when project is created)
        (!projectCreated && (currentStep === 1 || currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5)) ? React.createElement(Box, { key: 'instructions', marginTop: 3 }, [
          React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 
            currentStep === 1 ? 'Enter project name, then press Enter to continue' :
            currentStep === 2 ? 'Use arrow keys to select language, then press Enter to continue' :
            currentStep === 3 ? 'Enter LLM node names separated by comma, then press Enter to continue' :
            currentStep === 4 ? 'Enter tool names separated by comma, then press Enter to continue' :
            currentStep === 5 ? 'Enter LLM provider name, then press Enter to complete' :
            ''
          ),
        ]) : null,
      ]);
    }

    render(React.createElement(ModularAICreateWizard), {
      exitOnCtrlC: true,
      patchConsole: false,
      stdout: process.stdout,
      stdin: process.stdin,
      debug: false,
      experimental: true
    });
  });
}

module.exports = { showModularAgenticCreateWizard };
