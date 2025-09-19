/**
 * Modular Ink Agentic Create Wizard using component architecture
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
  const { FrameworkStep } = require('./components/FrameworkStep');
  const { RuntimeStep } = require('./components/RuntimeStep');
  const { OrchestrationStyleStep } = require('./components/OrchestrationStyleStep');
  const { AgentStep } = require('./components/AgentStep');
  const { ToolsStep } = require('./components/ToolsStep');
  const { ModelStep } = require('./components/ModelStep');
  const { StorageStep } = require('./components/StorageStep');

  return new Promise((resolve, reject) => {
    function ModularAgenticCreateWizard() {
      // State management - simplified for agentic create
      const [currentStep, setCurrentStep] = React.useState(1);
      const [projectName, setProjectName] = React.useState('');
      const [codeLanguage, setCodeLanguage] = React.useState('');
      const [selectedLanguageIndex, setSelectedLanguageIndex] = React.useState(0);
      const [framework, setFramework] = React.useState('');
      const [selectedFrameworkIndex, setSelectedFrameworkIndex] = React.useState(0);
      const [runtime, setRuntime] = React.useState('');
      const [selectedRuntimeIndex, setSelectedRuntimeIndex] = React.useState(0);
      const [orchestrationStyle, setOrchestrationStyle] = React.useState('');
      const [selectedOrchestrationIndex, setSelectedOrchestrationIndex] = React.useState(0);
      const [selectedStages, setSelectedStages] = React.useState(['retrieve', 'reason', 'act']); // Default all stages
      const [selectedStageIndex, setSelectedStageIndex] = React.useState(0); // For arrow navigation
      const [subAgents, setSubAgents] = React.useState(0);
      const [agentConfigMode, setAgentConfigMode] = React.useState('stages'); // 'stages' or 'subagents'
      const [selectedTools, setSelectedTools] = React.useState([]); // Default no tools
      const [selectedToolIndex, setSelectedToolIndex] = React.useState(0); // For arrow navigation
      const [provider, setProvider] = React.useState('');
      const [selectedProviderIndex, setSelectedProviderIndex] = React.useState(0);
      const [modelName, setModelName] = React.useState('');
      const [modelConfigMode, setModelConfigMode] = React.useState('provider'); // 'provider' or 'model'
      const [memory, setMemory] = React.useState('');
      const [cache, setCache] = React.useState('');
      const [sql, setSql] = React.useState('');
      const [selectedMemoryIndex, setSelectedMemoryIndex] = React.useState(0);
      const [selectedCacheIndex, setSelectedCacheIndex] = React.useState(0);
      const [selectedSqlIndex, setSelectedSqlIndex] = React.useState(0);
      const [currentStorageType, setCurrentStorageType] = React.useState('memory'); // 'memory', 'cache', or 'sql'
      const [error, setError] = React.useState(null);
      
      const languages = ['Python', 'Typescript/JavaScript'];
      const frameworks = ['Base', 'LangChain', 'LangGraph'];
      const runtimes = ['fastapi', 'express', 'cli', 'worker'];
      const orchestrationStyles = ['pipeline', 'router', 'state-graph'];
      const availableStages = ['retrieve', 'reason', 'act'];
      const availableTools = ['http_fetch', 'web_search', 'calculator', 'file_io', 'code_run'];
      const providers = ['mock', 'ollama'];
      const storageOptions = {
        memory: ['faiss-local', 'none'],
        cache: ['in-memory', 'redis'],
        sql: ['sqlite', 'none']
      };
      
      // Input handling - simplified for project name only
      useInput((input, key) => {
        // Handle Ctrl+C to cancel
        if (key.ctrl && input === 'c') {
          reject(new Error('Agentic create cancelled by user'));
          return;
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
            // Select language and move to framework selection
            setCodeLanguage(languages[selectedLanguageIndex]);
            setCurrentStep(3); // Move to framework selection step
          }
        }

        // Handle framework selection (step 3)
        if (currentStep === 3) {
          if (key.upArrow && selectedFrameworkIndex > 0) {
            setSelectedFrameworkIndex(selectedFrameworkIndex - 1);
          } else if (key.downArrow && selectedFrameworkIndex < frameworks.length - 1) {
            setSelectedFrameworkIndex(selectedFrameworkIndex + 1);
          } else if (key.return) {
            // Select framework and move to runtime selection
            setFramework(frameworks[selectedFrameworkIndex]);
            setCurrentStep(4); // Move to runtime selection step
          }
        }

        // Handle runtime selection (step 4)
        if (currentStep === 4) {
          if (key.upArrow && selectedRuntimeIndex > 0) {
            setSelectedRuntimeIndex(selectedRuntimeIndex - 1);
          } else if (key.downArrow && selectedRuntimeIndex < runtimes.length - 1) {
            setSelectedRuntimeIndex(selectedRuntimeIndex + 1);
          } else if (key.return) {
            // Select runtime and move to orchestration selection
            setRuntime(runtimes[selectedRuntimeIndex]);
            setCurrentStep(5); // Move to orchestration selection step
          }
        }

        // Handle orchestration style selection (step 5)
          if (currentStep === 5) {
          if (key.upArrow && selectedOrchestrationIndex > 0) {
            setSelectedOrchestrationIndex(selectedOrchestrationIndex - 1);
          } else if (key.downArrow && selectedOrchestrationIndex < orchestrationStyles.length - 1) {
            setSelectedOrchestrationIndex(selectedOrchestrationIndex + 1);
          } else if (key.return) {
            // Select orchestration style and move to agent configuration
            setOrchestrationStyle(orchestrationStyles[selectedOrchestrationIndex]);
            setCurrentStep(6); // Move to agent configuration step
          }
        }

        // Handle agent configuration (step 6)
        if (currentStep === 6) {
          if (agentConfigMode === 'stages') {
            // Handle stages selection with arrow keys and space
            if (key.upArrow && selectedStageIndex > 0) {
              setSelectedStageIndex(selectedStageIndex - 1);
            } else if (key.downArrow && selectedStageIndex < availableStages.length - 1) {
              setSelectedStageIndex(selectedStageIndex + 1);
            } else if (input === ' ' || key.space) {
              // Toggle current stage
              const currentStage = availableStages[selectedStageIndex];
              const newStages = selectedStages.includes(currentStage) 
                ? selectedStages.filter(s => s !== currentStage)
                : [...selectedStages, currentStage];
              setSelectedStages(newStages);
            } else if (key.return) {
              // Move to subagents configuration
              setAgentConfigMode('subagents');
            }
          } else if (agentConfigMode === 'subagents') {
            // Handle subagents number input
            if (input >= '0' && input <= '9') {
              setSubAgents(parseInt(input));
            } else if (key.return) {
              // Complete agent configuration and move to tools selection
              setCurrentStep(7); // Move to tools selection step
            }
          }
        }

        // Handle tools selection (step 7)
        if (currentStep === 7) {
          // Handle tools selection with arrow keys and space
          if (key.upArrow && selectedToolIndex > 0) {
            setSelectedToolIndex(selectedToolIndex - 1);
          } else if (key.downArrow && selectedToolIndex < availableTools.length - 1) {
            setSelectedToolIndex(selectedToolIndex + 1);
          } else if (input === ' ' || key.space) {
            // Toggle current tool
            const currentTool = availableTools[selectedToolIndex];
            const newTools = selectedTools.includes(currentTool) 
              ? selectedTools.filter(t => t !== currentTool)
              : [...selectedTools, currentTool];
            setSelectedTools(newTools);
          } else if (input === '1') {
            const newTools = selectedTools.includes('http_fetch') 
              ? selectedTools.filter(t => t !== 'http_fetch')
              : [...selectedTools, 'http_fetch'];
            setSelectedTools(newTools);
          } else if (input === '2') {
            const newTools = selectedTools.includes('web_search') 
              ? selectedTools.filter(t => t !== 'web_search')
              : [...selectedTools, 'web_search'];
            setSelectedTools(newTools);
          } else if (input === '3') {
            const newTools = selectedTools.includes('calculator') 
              ? selectedTools.filter(t => t !== 'calculator')
              : [...selectedTools, 'calculator'];
            setSelectedTools(newTools);
          } else if (input === '4') {
            const newTools = selectedTools.includes('file_io') 
              ? selectedTools.filter(t => t !== 'file_io')
              : [...selectedTools, 'file_io'];
            setSelectedTools(newTools);
          } else if (input === '5') {
            const newTools = selectedTools.includes('code_run') 
              ? selectedTools.filter(t => t !== 'code_run')
              : [...selectedTools, 'code_run'];
            setSelectedTools(newTools);
          } else if (key.return) {
            // Complete tools selection and move to model configuration
            setCurrentStep(8); // Move to model configuration step
          }
        }

        // Handle model configuration (step 8)
        if (currentStep === 8) {
          if (modelConfigMode === 'provider') {
            // Handle provider selection
            if (key.upArrow && selectedProviderIndex > 0) {
              setSelectedProviderIndex(selectedProviderIndex - 1);
            } else if (key.downArrow && selectedProviderIndex < providers.length - 1) {
              setSelectedProviderIndex(selectedProviderIndex + 1);
            } else if (key.return) {
              // Select provider and move to model name input
              setProvider(providers[selectedProviderIndex]);
              setModelConfigMode('model');
            }
          } else if (modelConfigMode === 'model') {
            // Handle model name input
            if (key.backspace || key.delete) {
              setModelName(modelName.slice(0, -1));
            } else if (key.return) {
              // Complete model configuration and move to storage configuration
              setCurrentStep(9); // Move to storage configuration step
            } else if (input && input.length === 1 && /^[a-zA-Z0-9._-]$/.test(input)) {
              setModelName(modelName + input);
            }
          }
        }

        // Handle storage configuration (step 9)
        if (currentStep === 9) {
          // Handle storage type navigation with Tab key
          if (key.tab) {
            const storageTypes = ['memory', 'cache', 'sql'];
            const currentIndex = storageTypes.indexOf(currentStorageType);
            const nextIndex = (currentIndex + 1) % storageTypes.length;
            setCurrentStorageType(storageTypes[nextIndex]);
          } else if (key.upArrow) {
            // Navigate options within current storage type
            if (currentStorageType === 'memory' && selectedMemoryIndex > 0) {
              setSelectedMemoryIndex(selectedMemoryIndex - 1);
            } else if (currentStorageType === 'cache' && selectedCacheIndex > 0) {
              setSelectedCacheIndex(selectedCacheIndex - 1);
            } else if (currentStorageType === 'sql' && selectedSqlIndex > 0) {
              setSelectedSqlIndex(selectedSqlIndex - 1);
            }
          } else if (key.downArrow) {
            // Navigate options within current storage type
            if (currentStorageType === 'memory' && selectedMemoryIndex < storageOptions.memory.length - 1) {
              setSelectedMemoryIndex(selectedMemoryIndex + 1);
            } else if (currentStorageType === 'cache' && selectedCacheIndex < storageOptions.cache.length - 1) {
              setSelectedCacheIndex(selectedCacheIndex + 1);
            } else if (currentStorageType === 'sql' && selectedSqlIndex < storageOptions.sql.length - 1) {
              setSelectedSqlIndex(selectedSqlIndex + 1);
            }
          } else if (key.return) {
            // Select current option and move to next storage type or complete
            if (currentStorageType === 'memory') {
              setMemory(storageOptions.memory[selectedMemoryIndex]);
              setCurrentStorageType('cache');
            } else if (currentStorageType === 'cache') {
              setCache(storageOptions.cache[selectedCacheIndex]);
              setCurrentStorageType('sql');
            } else if (currentStorageType === 'sql') {
              setSql(storageOptions.sql[selectedSqlIndex]);
              // All storage configured, move to completion
              setCurrentStep(10);
            }
          }
        }

        // Handle completion step (step 10)
        if (currentStep === 10) {
          // Auto-complete after showing success message
          setTimeout(async () => {
            const configData = {
              project: {
                name: projectName || 'my-agentic-project',
                language: (codeLanguage || 'Python').toLowerCase().replace('typescript/javascript', 'javascript'),
                framework: (framework || 'Base').toLowerCase()
              },
              runtime: {
                type: runtime || 'fastapi',
                port: runtime === 'express' ? 3000 : 8000
              },
              orchestration: {
                style: orchestrationStyle || 'pipeline'
              },
              agent: {
                stages: selectedStages.length > 0 ? selectedStages : ['retrieve', 'reason', 'act'],
                subAgents: subAgents
              },
              tools: {
                selected: selectedTools
              },
              model: {
                provider: provider || 'mock',
                name: modelName || 'mock-llm'
              },
              storage: {
                memory: memory || 'none',
                cache: cache || 'in-memory',
                sql: sql || 'none'
              }
            };

            // Save configuration to JSON file
            try {
              const configPath = path.join(process.cwd(), `${configData.project.name.toLowerCase().replace(/\s+/g, '-')}-config.json`);
              await fs.writeJson(configPath, configData, { spaces: 2 });
              console.log(`\n✅ Configuration saved to: ${configPath}`);
            } catch (error) {
              console.error(`\n❌ Failed to save configuration: ${error.message}`);
            }

            resolve({
              projectName: configData.project.name,
              codeLanguage: configData.project.language,
              framework: configData.project.framework,
              runtime: configData.runtime.type,
              orchestrationStyle: configData.orchestration.style,
              stages: configData.agent.stages,
              subAgents: configData.agent.subAgents,
              tools: configData.tools.selected,
              provider: configData.model.provider,
              modelName: configData.model.name,
              storage: configData.storage,
              scaffoldingCreated: true,
              configPath: path.join(process.cwd(), `${configData.project.name.toLowerCase().replace(/\s+/g, '-')}-config.json`)
            });
          }, 2000);
        }
      });

      // Auto-trigger completion effect
      React.useEffect(() => {
        if (currentStep === 10) {
          // Auto-complete after 2 seconds
          setTimeout(async () => {
            const configData = {
              project: {
                name: projectName || 'my-agentic-project',
                language: (codeLanguage || 'Python').toLowerCase().replace('typescript/javascript', 'javascript'),
                framework: (framework || 'Base').toLowerCase()
              },
              runtime: {
                type: runtime || 'fastapi',
                port: runtime === 'express' ? 3000 : 8000
              },
              orchestration: {
                style: orchestrationStyle || 'pipeline'
              },
              agent: {
                stages: selectedStages.length > 0 ? selectedStages : ['retrieve', 'reason', 'act'],
                subAgents: subAgents
              },
              tools: {
                selected: selectedTools
              },
              model: {
                provider: provider || 'mock',
                name: modelName || 'mock-llm'
              },
              storage: {
                memory: memory || 'none',
                cache: cache || 'in-memory',
                sql: sql || 'none'
              }
            };

            // Save configuration to JSON file
            try {
              const configPath = path.join(process.cwd(), `${configData.project.name.toLowerCase().replace(/\s+/g, '-')}-config.json`);
              await fs.writeJson(configPath, configData, { spaces: 2 });
              console.log(`\n✅ Configuration saved to: ${configPath}`);
            } catch (error) {
              console.error(`\n❌ Failed to save configuration: ${error.message}`);
            }

            resolve({
              projectName: configData.project.name,
              codeLanguage: configData.project.language,
              framework: configData.project.framework,
              runtime: configData.runtime.type,
              orchestrationStyle: configData.orchestration.style,
              stages: configData.agent.stages,
              subAgents: configData.agent.subAgents,
              tools: configData.tools.selected,
              provider: configData.model.provider,
              modelName: configData.model.name,
              storage: configData.storage,
              scaffoldingCreated: true,
              configPath: path.join(process.cwd(), `${configData.project.name.toLowerCase().replace(/\s+/g, '-')}-config.json`)
            });
          }, 2000);
        }
      }, [currentStep]);


        // Get current input value for cursor
        const getCurrentValue = () => {
          if (currentStep === 1) return projectName;
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
            projectName: projectName || 'my-agentic-project',
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
        
        // Step 3: Framework (show when on step 3 or when completed)
        (currentStep === 3 || (currentStep > 3 && framework)) ? React.createElement(Box, { key: 'framework-step' },
          FrameworkStep(React, Box, Text, {
            framework: framework || 'base',
            selectedIndex: selectedFrameworkIndex,
            isCompleted: currentStep > 3 && framework
          })
        ) : null,
        
        // Step 4: Runtime (show when on step 4 or when completed)
        (currentStep === 4 || (currentStep > 4 && runtime)) ? React.createElement(Box, { key: 'runtime-step' },
          RuntimeStep(React, Box, Text, {
            runtime: runtime || 'fastapi',
            selectedIndex: selectedRuntimeIndex,
            isCompleted: currentStep > 4 && runtime
          })
        ) : null,
        
        // Step 5: Orchestration Style (show when on step 5 or when completed)
        (currentStep === 5 || (currentStep > 5 && orchestrationStyle)) ? React.createElement(Box, { key: 'orchestration-step' },
          OrchestrationStyleStep(React, Box, Text, {
            orchestrationStyle: orchestrationStyle || 'pipeline',
            selectedIndex: selectedOrchestrationIndex,
            isCompleted: currentStep > 5 && orchestrationStyle
          })
        ) : null,
        
        // Step 6: Agent Configuration (show when on step 6 or when completed)
        (currentStep === 6 || (currentStep > 6)) ? React.createElement(Box, { key: 'agent-step' },
          AgentStep(React, Box, Text, {
            selectedStages: selectedStages,
            subAgents: subAgents,
            currentMode: agentConfigMode,
            selectedStageIndex: selectedStageIndex,
            isCompleted: currentStep > 6
          })
        ) : null,
        
        // Step 7: Tools Configuration (show when on step 7 or when completed)
        (currentStep === 7 || (currentStep > 7)) ? React.createElement(Box, { key: 'tools-step' },
          ToolsStep(React, Box, Text, {
            selectedTools: selectedTools,
            selectedToolIndex: selectedToolIndex,
            isCompleted: currentStep > 7
          })
        ) : null,
        
        // Step 8: Model Configuration (show when on step 8 or when completed)
        (currentStep === 8 || (currentStep > 8)) ? React.createElement(Box, { key: 'model-step' },
          ModelStep(React, Box, Text, {
            provider: provider,
            modelName: modelName,
            selectedProviderIndex: selectedProviderIndex,
            currentMode: modelConfigMode,
            isCompleted: currentStep > 8
          })
        ) : null,
        
        // Step 9: Storage Configuration (show when on step 9 or when completed)
        (currentStep === 9 || (currentStep > 9)) ? React.createElement(Box, { key: 'storage-step' },
          StorageStep(React, Box, Text, {
            memory: memory,
            cache: cache,
            sql: sql,
            selectedMemoryIndex: selectedMemoryIndex,
            selectedCacheIndex: selectedCacheIndex,
            selectedSqlIndex: selectedSqlIndex,
            currentStorageType: currentStorageType,
            isCompleted: currentStep > 9
          })
        ) : null,
        
        // Step 10: Completion Message
        currentStep === 10 ? React.createElement(Box, { key: 'completion-step', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'completion-title', color: '#71f2af', bold: true }, '🎉 Scaffolding Created!'),
          React.createElement(Text, { key: 'completion-subtitle', color: 'white', marginTop: 1 }, `Project "${projectName}" configured successfully!`),
          React.createElement(Text, { key: 'completion-details', color: '#c8c8c84d', marginTop: 1 }, `${codeLanguage} + ${framework} + ${runtime} + ${orchestrationStyle}`),
          React.createElement(Text, { key: 'completion-agent', color: '#c8c8c84d', marginTop: 1 }, `stages:[${selectedStages.join(',')}] + subagents:${subAgents} + tools:[${selectedTools.join(',')}]`),
          React.createElement(Text, { key: 'completion-model', color: '#c8c8c84d', marginTop: 1 }, `model:${provider}/${modelName}`),
          React.createElement(Text, { key: 'completion-storage', color: '#c8c8c84d', marginTop: 1 }, `storage:${memory},${cache},${sql}`),
          React.createElement(Text, { key: 'completion-note', color: '#c8c8c84d', marginTop: 1 }, 'Closing in 2 seconds...'),
        ]) : null,
        
        // Error message
        error ? React.createElement(Box, { key: 'error', marginTop: 2 }, [
          React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
        ]) : null,
        
        // Instructions
        (currentStep === 1 || currentStep === 2 || currentStep === 3 || currentStep === 4 || currentStep === 5 || currentStep === 6 || currentStep === 7 || currentStep === 8 || currentStep === 9) ? React.createElement(Box, { key: 'instructions', marginTop: 3 }, [
          React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 
            currentStep === 1 ? 'Enter project name, then press Enter to continue' :
            currentStep === 2 ? 'Use arrow keys to select language, then press Enter to continue' :
            currentStep === 3 ? 'Use arrow keys to select framework, then press Enter to continue' :
            currentStep === 4 ? 'Use arrow keys to select runtime, then press Enter to continue' :
            currentStep === 5 ? 'Use arrow keys to select orchestration style, then press Enter to continue' :
            currentStep === 6 ? (agentConfigMode === 'stages' ? 'Use arrow keys to navigate, Space to toggle stages, Enter to continue to subagents' : 'Enter number 0-9 for subagents, Enter to finish') :
            currentStep === 7 ? 'Use arrow keys to navigate, Space to toggle tools (numbers 1-5 also work), Enter to continue' :
            currentStep === 8 ? (modelConfigMode === 'provider' ? 'Use arrow keys to select provider, Enter to continue' : 'Type model name, Enter to finish') :
            currentStep === 9 ? `Configure ${currentStorageType}: arrow keys to select, Enter to confirm (Tab to switch storage type)` :
            ''
          ),
        ]) : null,
      ]);
    }

    render(React.createElement(ModularAgenticCreateWizard), {
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
