/**
 * Modular Ink Setup Wizard using component architecture
 */
const React = require('react');

/**
 * Reconstruct a full file path from potentially chunked inputs
 * @param {string} existingPath - The existing path fragment
 * @param {string} newChunk - The new chunk to add
 * @returns {string|null} - The reconstructed path or null if not applicable
 */
function reconstructPath(existingPath, newChunk) {
  const path = require('path');
  const fs = require('fs-extra');
  
  // Remove quotes from both parts
  const cleanExisting = existingPath.replace(/^['"]|['"]$/g, '');
  const cleanNewChunk = newChunk.replace(/^['"]|['"]$/g, '');
  
  // Try different reconstruction strategies
  const strategies = [
    // Strategy 1: Direct concatenation
    () => cleanExisting + cleanNewChunk,
    
    // Strategy 2: Remove trailing quote from existing, add new chunk
    () => cleanExisting.replace(/['"]$/, '') + cleanNewChunk,
    
    // Strategy 3: Remove leading quote from new chunk, concatenate
    () => cleanExisting + cleanNewChunk.replace(/^['"]/, ''),
    
    // Strategy 4: Handle truncated words (like "projec" -> "projects")
    () => {
      // Look for common truncation patterns
      const truncationPatterns = [
        { from: /projec$/, to: 'projects' },
        { from: /docu$/, to: 'documents' },
        { from: /handi$/, to: 'handit' },
        { from: /src\/$/, to: 'src/' }
      ];
      
      let reconstructed = cleanExisting;
      for (const pattern of truncationPatterns) {
        if (pattern.from.test(reconstructed)) {
          reconstructed = reconstructed.replace(pattern.from, pattern.to);
          break;
        }
      }
      
      return reconstructed + cleanNewChunk;
    }
  ];
  
  // Try each strategy and validate the result
  for (const strategy of strategies) {
    try {
      const candidate = strategy();
      
      // Validate the candidate path
      if (isValidPath(candidate)) {
        return candidate;
      }
    } catch (error) {
      // Continue to next strategy
      continue;
    }
  }
  
  return null;
}

/**
 * Check if a path looks valid
 * @param {string} pathCandidate - The path to validate
 * @returns {boolean} - Whether the path looks valid
 */
function isValidPath(pathCandidate) {
  const path = require('path');
  const fs = require('fs-extra');
  
  // Basic validation
  if (!pathCandidate || pathCandidate.length < 5) return false;
  
  // Check for common path patterns
  const hasValidPattern = (
    // Unix-style absolute path
    pathCandidate.startsWith('/') ||
    // Windows-style absolute path
    pathCandidate.match(/^[A-Za-z]:/) ||
    // Relative path with file extension
    (pathCandidate.includes('/') && pathCandidate.includes('.'))
  );
  
  if (!hasValidPattern) return false;
  
  // Try to resolve and check if file exists
  try {
    const resolvedPath = path.resolve(pathCandidate);
    return fs.existsSync(resolvedPath);
  } catch (error) {
    return false;
  }
}

async function showModularSetupWizard(config) {
  const { render } = await import('ink');
  const { Box, Text, useInput } = await import('ink');

  // Import all components
  const { WelcomeHeader } = require('./components/WelcomeHeader');
  const { AgentNameStep } = require('./components/AgentNameStep');
  const { EntryFileStep } = require('./components/EntryFileStep');
  const { EntryFunctionStep } = require('./components/EntryFunctionStep');
  const { FileDetectionStep } = require('./components/FileDetectionStep');
  const { FileSelectionStep } = require('./components/FileSelectionStep');
  const { FunctionSelectionStep } = require('./components/FunctionSelectionStep');
  const { CodeDiffViewer } = require('./components/CodeDiffViewer');

  return new Promise((resolve, reject) => {
    function ModularSetupWizard() {
      // State management
      const [currentStep, setCurrentStep] = React.useState(1);
      const [agentName, setAgentName] = React.useState('');
  const [entryFile, setEntryFile] = React.useState('');
  const [entryFunction, setEntryFunction] = React.useState('');
  const [previousInput, setPreviousInput] = React.useState('');
  const previousInputRef = React.useRef('');
      const [error, setError] = React.useState(null);
      
      // File detection state
      const [fileDetectionStatus, setFileDetectionStatus] = React.useState('');
      const [fileDetectionProgress, setFileDetectionProgress] = React.useState(0);
      const [possibleFiles, setPossibleFiles] = React.useState([]);
      const [selectedFileIndex, setSelectedFileIndex] = React.useState(0);
      const [selectedFile, setSelectedFile] = React.useState(null);
      const [fileAnalysis, setFileAnalysis] = React.useState(null);
      const [selectedFunctionIndex, setSelectedFunctionIndex] = React.useState(0);
      const [selectedFunction, setSelectedFunction] = React.useState(null);
      
      // Diff viewer state
      const [selectedDiffOption, setSelectedDiffOption] = React.useState(0); // 0 = Yes, 1 = No
      
      // AI Code Generation state
      const [aiGenerationStatus, setAiGenerationStatus] = React.useState('');
      const [aiGenerationProgress, setAiGenerationProgress] = React.useState(0);
      const [codeChanges, setCodeChanges] = React.useState(null);
      
      // File Writing state
      const [fileWritingStatus, setFileWritingStatus] = React.useState('');
      const [fileWritingProgress, setFileWritingProgress] = React.useState(0);
      const [originalFileContent, setOriginalFileContent] = React.useState(null);
      const [modifiedFileContent, setModifiedFileContent] = React.useState(null);
      const [shouldApplyCode, setShouldApplyCode] = React.useState(null);
      const [setupInstructions, setSetupInstructions] = React.useState(null);
      
      // Input buffer for handling large inputs (currently unused but reserved for future use)
      // const [inputBuffer, setInputBuffer] = React.useState('');

      // Input handling
      useInput((input, key) => {
        // Debug: Log input to understand paste behavior
        if (process.env.DEBUG_INPUT) {
          console.log('Input received:', JSON.stringify(input), 'Length:', input.length, 'Key:', JSON.stringify(key));
        }

        // Handle Ctrl+C (only if not in final step with auto-close)
        if (key.ctrl && input === 'c' && currentStep !== 10) {
          reject(new Error('Setup cancelled by user'));
          return;
        }

        // Handle Ctrl+V paste (though Ink handles this automatically in most cases)
        if (key.ctrl && input === 'v') {
          // Ctrl+V is handled by Ink's built-in paste support
          return;
        }

        // Handle input steps (1-3)
        if (currentStep >= 1 && currentStep <= 3) {
          if (key.return) {
            // Move to next step
            if (currentStep === 1 && agentName.trim()) {
              setCurrentStep(2);
            } else if (currentStep === 2 && entryFile.trim()) {
              setCurrentStep(3);
            } else if (currentStep === 3 && entryFunction.trim()) {
              setCurrentStep(4);
            }
          } else if (key.delete || key.backspace || input === '\u007f' || input === '\b' || input === '\x7f') {
            // Handle backspace
            if (currentStep === 1) setAgentName(agentName.slice(0, -1));
            else if (currentStep === 2) setEntryFile(entryFile.slice(0, -1));
            else if (currentStep === 3) setEntryFunction(entryFunction.slice(0, -1));
          } else if (input && input.length > 0) {
            // Handle regular input (including paste operations with multiple characters)
            let processedInput = input;
            
            
            // Debug large inputs
            if (process.env.DEBUG_INPUT && input.length > 50) {
              console.log('Large input detected:', input.length, 'characters');
            }
            
            // Handle drag and drop file paths or multi-line content
            // Also handle file paths that look like they might be truncated
            if (input.includes('\n') || input.includes('\r') || input.includes('/') || input.includes('\\') || 
                (currentStep === 2 && input.includes('.') && input.length > 10)) {
              
              let cleanedInput = input;
              
              // Handle multi-line input (common with drag and drop or large paste)
              if (input.includes('\n') || input.includes('\r')) {
                const lines = input.split(/[\n\r]+/).filter(line => line.trim());
                if (lines.length > 0) {
                  // For step 2 (file path), take only the first line
                  // For other steps, join all lines
                  if (currentStep === 2) {
                    cleanedInput = lines[0].trim();
                  } else {
                    cleanedInput = lines.join(' ').trim();
                  }
                }
              }
              
              // Remove quotes if present (common with drag and drop)
              if ((cleanedInput.startsWith('"') && cleanedInput.endsWith('"')) ||
                  (cleanedInput.startsWith("'") && cleanedInput.endsWith("'"))) {
                cleanedInput = cleanedInput.slice(1, -1);
              }
              
              // For file paths (step 2), process the path
              if (currentStep === 2 && cleanedInput) {
                const path = require('path');
                const fs = require('fs-extra');
                const projectRoot = config.projectRoot || process.cwd();
                
                try {
                  // Check if it's an absolute path
                  if (path.isAbsolute(cleanedInput)) {
                    // Try to make it relative to project root
                    const relativePath = path.relative(projectRoot, cleanedInput);
                    if (!relativePath.startsWith('..') && fs.existsSync(cleanedInput)) {
                      processedInput = relativePath;
                    } else {
                      processedInput = cleanedInput;
                    }
                  } else {
                    // It's a relative path, but it might be truncated
                    // Try to find the full path by searching from common locations
                    const possiblePaths = [
                      path.resolve(projectRoot, cleanedInput),
                      path.resolve(process.cwd(), cleanedInput),
                      path.resolve(process.env.HOME || '', cleanedInput),
                      path.resolve('/Users', cleanedInput),
                      path.resolve('/Users', process.env.USER || '', cleanedInput),
                      path.resolve('/Users', process.env.USER || '', 'Documents', cleanedInput)
                    ];
                    
                    // Find the first path that exists
                    const existingPath = possiblePaths.find(p => fs.existsSync(p));
                    if (existingPath) {
                      // Try to make it relative to project root
                      const relativePath = path.relative(projectRoot, existingPath);
                      if (!relativePath.startsWith('..') && relativePath !== '') {
                        processedInput = relativePath;
                      } else {
                        processedInput = existingPath;
                      }
                    } else {
                      processedInput = cleanedInput;
                    }
                  }
                } catch (error) {
                  // If path processing fails, use the cleaned input
                  processedInput = cleanedInput;
                }
                
                // Debug: Log the final processed input
                if (process.env.DEBUG_DRAG_DROP) {
                  const fs = require('fs-extra');
                  const debugLog = {
                    timestamp: new Date().toISOString(),
                    step: currentStep,
                    cleanedInput: cleanedInput,
                    processedInput: processedInput,
                    isAbsolute: path.isAbsolute(cleanedInput),
                    projectRoot: projectRoot
                  };
                  fs.appendFileSync('/tmp/drag-drop-debug.log', JSON.stringify(debugLog, null, 2) + '\n---\n');
                }
              } else {
                processedInput = cleanedInput;
              }
            }
            
            // Apply the input to the appropriate field
            if (currentStep === 1) {
              setAgentName(agentName + processedInput);
            } else if (currentStep === 2) {
              // Smart path reconstruction for drag and drop chunking
              let newEntryFile = entryFile + processedInput;
              
              // Detect if this looks like a path chunk continuation
              // Special case: if current input starts with "ts/" and looks like a path fragment,
              // it might be the continuation of a truncated absolute path
              const isPathChunk = (
                // Current input looks like a path fragment
                (processedInput.includes('/') || processedInput.includes('\\')) &&
                // Either previous input has slashes OR current input starts with "ts/" (common pattern)
                ((entryFile.includes('/') || entryFile.includes('\\')) || 
                 (processedInput.startsWith('ts/') && processedInput.includes('.'))) &&
                // Current input doesn't start with a quote (indicating new path)
                !processedInput.startsWith("'") && !processedInput.startsWith('"')
              );
              
              
              if (isPathChunk) {
                // Try to reconstruct the full path using previous input if entryFile is empty
                const sourcePath = entryFile || previousInputRef.current;
                const reconstructedPath = reconstructPath(sourcePath, processedInput);
                
                if (reconstructedPath && reconstructedPath !== newEntryFile) {
                  newEntryFile = reconstructedPath;
                }
              }
              
              // Store current input as previous for next iteration
              setPreviousInput(processedInput);
               previousInputRef.current = processedInput;
              
              setEntryFile(newEntryFile);
            } else if (currentStep === 3) {
              setEntryFunction(entryFunction + processedInput);
            }
          }
        }

        // Handle file selection
        if (currentStep === 5.5) {
          if (key.upArrow && selectedFileIndex > 0) {
            setSelectedFileIndex(selectedFileIndex - 1);
          } else if (key.downArrow && selectedFileIndex < possibleFiles.length - 1) {
            setSelectedFileIndex(selectedFileIndex + 1);
          } else if (key.return) {
            setSelectedFile(possibleFiles[selectedFileIndex]);
            setCurrentStep(6);
          }
        }

        // Handle function selection
        if (currentStep === 6.5) {
          if (key.upArrow && selectedFunctionIndex > 0) {
            setSelectedFunctionIndex(selectedFunctionIndex - 1);
          } else if (key.downArrow && selectedFunctionIndex < (fileAnalysis?.functions?.length || 0) - 1) {
            setSelectedFunctionIndex(selectedFunctionIndex + 1);
          } else if (key.return) {
            setSelectedFunction(fileAnalysis.functions[selectedFunctionIndex]);
            setCurrentStep(7); // Go directly to AI code generation
          }
        }

        // Handle final completion step (step 10)
        if (currentStep === 10 && key.ctrl && input === 'c') {
          resolve({
            agentName: agentName || 'my-agent',
            entryFile: selectedFile?.file || entryFile,
            entryFunction: selectedFunction?.name || entryFunction,
            applied: shouldApplyCode
          });
          return;
        }

        // Handle diff viewer
        if (currentStep === 8 && codeChanges) {
          if (key.leftArrow) {
            setSelectedDiffOption(0); // Yes
          } else if (key.rightArrow) {
            setSelectedDiffOption(1); // No
          } else if (input === 'y' || input === 'Y' || (key.return && selectedDiffOption === 0)) {
            setShouldApplyCode(true);
            // Write the file when user confirms
            if (codeChanges.length > 0 && selectedFile && modifiedFileContent) {
              setTimeout(async () => {
                try {
                  setFileWritingStatus('📝 Applying changes to file...');
                  setFileWritingProgress(20);
                  
                  const fs = require('fs-extra');
                  const path = require('path');
                  const filePath = path.resolve(selectedFile.file);
                  
                  // Simulate progressive file writing
                  await new Promise(resolve => setTimeout(resolve, 200));
                  setFileWritingProgress(50);
                  
                  // Use the already generated modified content
                  await fs.writeFile(filePath, modifiedFileContent);
                  
                  setFileWritingProgress(80);
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  setFileWritingProgress(100);
                  setFileWritingStatus('✅ Changes applied successfully!');
                  
                  console.log(`✅ Successfully applied changes to ${selectedFile.file}`);
                } catch (error) {
                  setFileWritingStatus('❌ Failed to apply changes');
                  setError(`Failed to write file: ${error.message}`);
                }
              }, 100);
            }
            setCurrentStep(9);
          } else if (input === 'n' || input === 'N' || (key.return && selectedDiffOption === 1)) {
            setShouldApplyCode(false);
            setCurrentStep(9);
          }
        }
      });

        // Auto-advance from step 4 to step 5 after a delay
        React.useEffect(() => {
          if (currentStep === 4) {
            const timer = setTimeout(() => {
              setCurrentStep(5);
            }, 2000); // 2 second delay to show the completion message
            
            return () => clearTimeout(timer);
          }
        }, [currentStep]);

        // File detection effect
        React.useEffect(() => {
          if (currentStep === 5) {
            // eslint-disable-next-line no-inner-declarations
            async function runFileDetection() {
              try {
                setFileDetectionStatus('🔍 Analyzing files in project...');
                setFileDetectionProgress(0);
                
                const { getAllFiles, findPossibleFiles } = require('../utils/fileDetector');
                const allFiles = await getAllFiles(config.projectRoot);
                const files = await findPossibleFiles(entryFile, allFiles);
                
                setFileDetectionProgress(50);
                setPossibleFiles(files);
                setFileDetectionProgress(100);
                setCurrentStep(5.5);
                
              } catch (error) {
                setError(`File detection failed: ${error.message}`);
              }
            }
            
            runFileDetection();
          }
        }, [currentStep]);

        // Function detection effect
        React.useEffect(() => {
          if (currentStep === 6 && selectedFile) {
            // eslint-disable-next-line no-inner-declarations
            async function runFunctionDetection() {
            try {
                const { findFunctionInFile } = require('../utils/fileDetector');
              const analysis = await findFunctionInFile(entryFunction, selectedFile.file, config.projectRoot);
              
              setFileAnalysis(analysis);
              setCurrentStep(6.5);
              
            } catch (error) {
              setError(`Function detection failed: ${error.message}`);
            }
          }
          
          runFunctionDetection();
        }
      }, [currentStep, selectedFile]);

        // AI Code Generation effect
        React.useEffect(() => {
          if (currentStep === 7 && selectedFunction) {
            // eslint-disable-next-line no-inner-declarations
            async function runAICodeGeneration() {
            try {
              setAiGenerationStatus('🔄 AI-Powered Code Generation');
              setAiGenerationProgress(10);
              
              // Use the existing SimplifiedCodeGenerator
              const fs = require('fs-extra');
              const path = require('path');
              const { SimplifiedCodeGenerator } = require('../generator/simplifiedGenerator');
              
              await new Promise(resolve => setTimeout(resolve, 300));
              setAiGenerationStatus('📖 Reading file content...');
              setAiGenerationProgress(25);
              
              // Detect language from the selected file
              const { detectLanguageFromFile } = require('../setup/detectLanguage');
              const language = detectLanguageFromFile(selectedFile.file);
              
              await new Promise(resolve => setTimeout(resolve, 200));
              setAiGenerationProgress(40);
              
              const generator = new SimplifiedCodeGenerator(
                language, 
                agentName || 'my-agent', 
                config.projectRoot
              );
              
              setAiGenerationStatus('🤖 Setting up your Autonomous Engineer...');
              setAiGenerationProgress(60);
              
              // Generate the modified content using the existing logic
              const filePath = path.resolve(selectedFile.file);
              const fileContent = await fs.readFile(filePath, 'utf8');
              
              await new Promise(resolve => setTimeout(resolve, 400));
              setAiGenerationProgress(75);
              
              const modifiedContent = await generator.addHanditIntegrationToFile(
                fileContent, 
                selectedFile.file, 
                selectedFunction.name, 
                agentName || 'my-agent'
              );
              
              await new Promise(resolve => setTimeout(resolve, 300));
              setAiGenerationProgress(100);
              setAiGenerationStatus('✅ AI-generated handit integration complete');
              
              // Compute diff using the existing SimplifiedCodeGenerator logic
              // Clean up the lines to avoid undefined issues
              const originalLines = fileContent.split('\n').map(line => line || '');
              const modifiedLines = modifiedContent.split('\n').map(line => line || '');
              const changes = generator.computeSmartDiff(originalLines, modifiedLines);
              setCodeChanges(changes);
              setOriginalFileContent(originalLines);
              setModifiedFileContent(modifiedContent);
              setCurrentStep(8); // Move to diff viewer
              
            } catch (error) {
              console.error('AI Generation Error:', error);
              setError(`AI code generation failed: ${error.message}`);
            }
          }
          
          runAICodeGeneration();
        }
      }, [currentStep, selectedFunction]);

      // Final completion effect
      React.useEffect(() => {
        if (currentStep === 9 && shouldApplyCode !== null) {
          setTimeout(() => {
            setCurrentStep(10); // Move to final completion step
          }, 1000);
        }
      }, [currentStep, shouldApplyCode]);

      // Final completion step effect
      React.useEffect(() => {
        if (currentStep === 10) {
          setTimeout(async () => {
            try {
              // Update repository URL with progressive progress
              setFileWritingStatus('🔗 Updating repository URL...');
              setFileWritingProgress(10);
              
              const { updateRepositoryUrlForAgent } = require('../index');
              
              await new Promise(resolve => setTimeout(resolve, 300));
              setFileWritingProgress(30);
              
              await updateRepositoryUrlForAgent(agentName || 'my-agent');
              
              setFileWritingProgress(60);
              setFileWritingStatus('✅ Repository URL updated successfully!');
              
              // Show final success message and setup instructions
              setFileWritingStatus('📋 Generating setup instructions...');
              setFileWritingProgress(80);
              
              const { SimplifiedCodeGenerator } = require('../generator/simplifiedGenerator');
              const { detectLanguageFromFile } = require('../setup/detectLanguage');
              const language = detectLanguageFromFile(selectedFile?.file || entryFile);
              
              await new Promise(resolve => setTimeout(resolve, 200));
              setFileWritingProgress(90);
              
              const generator = new SimplifiedCodeGenerator(
                language, 
                agentName || 'my-agent', 
                config.projectRoot,
                config.apiToken,
                config.stagingApiToken
              );
              
              // Store setup instructions for display in UI
              const setupInstructions = generator.getSetupInstructions();
              setSetupInstructions(setupInstructions);
              
              setFileWritingProgress(100);
              setFileWritingStatus('🎉 Setup complete!');
              
              // Auto-close after 3 seconds
              setTimeout(() => {
                resolve({
                  agentName: agentName || 'my-agent',
                  entryFile: selectedFile?.file || entryFile,
                  applied: true
                });
              }, 3000);
              
            } catch (error) {
              setError(`Final setup failed: ${error.message}`);
            }
          }, 1000);
        }
      }, [currentStep]);


        // Get current input value for cursor
        const getCurrentValue = () => {
          if (currentStep === 1) return agentName;
          if (currentStep === 2) return entryFile;
          if (currentStep === 3) return entryFunction;
          return '';
        };

      const displayValue = getCurrentValue() + (Date.now() % 1000 < 500 ? '_' : '');

      return React.createElement(Box, { flexDirection: 'column', padding: 2 }, [
        // Header (always visible)
        React.createElement(Box, { key: 'header', flexDirection: 'column', alignItems: 'center' }, 
          WelcomeHeader(React, Text)
        ),
        
        // Step 1: Agent Name
        currentStep >= 1 ? React.createElement(Box, { key: 'agent-name-step' },
          AgentNameStep(React, Box, Text, {
            agentName: agentName || 'my-agent',
            onInput: setAgentName,
            currentValue: displayValue
          })
        ) : null,
        
        // Step 2: Entry File
        currentStep >= 2 ? React.createElement(Box, { key: 'entry-file-step' },
          EntryFileStep(React, Box, Text, {
            entryFile: entryFile,
            onInput: setEntryFile,
            currentValue: displayValue
          })
        ) : null,
        
        // Step 3: Entry Function
        currentStep >= 3 ? React.createElement(Box, { key: 'entry-function-step' },
          EntryFunctionStep(React, Box, Text, {
            entryFunction: entryFunction,
            onInput: setEntryFunction,
            currentValue: displayValue
          })
        ) : null,
        
        // Step 4: Setup Complete
        currentStep === 4 ? React.createElement(Box, { key: 'step4', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'step4-title', color: 'green', bold: true }, '✅ Setup Complete!'),
          React.createElement(Text, { key: 'step4-subtitle', color: 'cyan', bold: true }, '🔍 Finding your entry point and setting up instrumentation...'),
          React.createElement(Text, { key: 'step4-description', color: 'yellow' }, 'Please wait while we analyze your code.'),
        ]) : null,
        
        // Step 5: File Detection
        currentStep === 5 ? React.createElement(Box, { key: 'file-detection-step' },
          FileDetectionStep(React, Box, Text, {
            status: fileDetectionStatus,
            progress: fileDetectionProgress
          })
        ) : null,
        
        // Step 5.5: File Selection
        currentStep === 5.5 ? React.createElement(Box, { key: 'file-selection-step' },
          FileSelectionStep(React, Box, Text, {
            possibleFiles,
            selectedIndex: selectedFileIndex,
            onSelect: setSelectedFile
          })
        ) : null,
        
        // Step 6: Function Detection
        currentStep === 6 ? React.createElement(Box, { key: 'step6', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'step6-title', color: 'cyan', bold: true }, 
            `🔍 Function Detection in ${selectedFile?.file || 'selected file'}`
          ),
          React.createElement(Box, { key: 'step6-progress', marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'step6-status', color: 'yellow' }, '🔍 Analyzing functions in file...'),
            React.createElement(Box, { key: 'step6-bar', marginTop: 1, width: 40 }, [
              React.createElement(Text, { key: 'step6-bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor(100 / 2.5))),
              React.createElement(Text, { key: 'step6-bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor(100 / 2.5))),
            ]),
          ]),
        ]) : null,
        
        // Step 6.5: Function Selection
        currentStep === 6.5 ? React.createElement(Box, { key: 'function-selection-step' },
          FunctionSelectionStep(React, Box, Text, {
            functions: fileAnalysis?.functions || [],
            selectedIndex: selectedFunctionIndex,
            onSelect: setSelectedFunction,
            selectedFile
          })
        ) : null,
        
        // Step 7: AI Code Generation
        currentStep === 7 ? React.createElement(Box, { key: 'step7', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'step7-title', color: 'cyan', bold: true }, aiGenerationStatus || '🔄 AI-Powered Code Generation'),
          aiGenerationStatus && !aiGenerationStatus.includes('complete') ? React.createElement(Box, { key: 'step8-progress', marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'step8-status', color: 'yellow' }, aiGenerationStatus),
            React.createElement(Box, { key: 'step8-bar', marginTop: 1, width: 40 }, [
              React.createElement(Text, { key: 'step8-bar-fill', backgroundColor: 'blue' }, '█'.repeat(Math.floor((aiGenerationProgress || 0) / 2.5))),
              React.createElement(Text, { key: 'step8-bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor((aiGenerationProgress || 0) / 2.5))),
            ]),
          ]) : null,
        ]) : null,
        
        // Step 8: Code Diff Viewer
        currentStep === 8 && codeChanges ? React.createElement(Box, { key: 'code-diff-viewer' },
          CodeDiffViewer(React, Box, Text, {
            filePath: selectedFile?.file,
            changes: codeChanges,
            originalFileContent: originalFileContent,
            onConfirm: () => setShouldApplyCode(true),
            onReject: () => setShouldApplyCode(false),
            selectedOption: selectedDiffOption
          })
        ) : null,
        
        // Step 9: Processing Changes
        currentStep === 9 ? React.createElement(Box, { key: 'step9', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'step9-title', color: 'green', bold: true }, '✅ Changes Applied Successfully!'),
          React.createElement(Text, { key: 'step9-subtitle', color: 'cyan', bold: true }, '🔧 Finalizing setup...'),
          React.createElement(Text, { key: 'step9-description', color: 'yellow' }, 'Please wait while we complete the setup process.'),
          
          // File Writing Progress Bar
          fileWritingStatus ? React.createElement(Box, { key: 'file-writing-progress', marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'file-writing-status', color: 'yellow' }, fileWritingStatus),
            React.createElement(Box, { key: 'file-writing-bar', marginTop: 1, width: 40 }, [
              React.createElement(Text, { key: 'file-writing-bar-fill', backgroundColor: 'green' }, '█'.repeat(Math.floor((fileWritingProgress || 0) / 2.5))),
              React.createElement(Text, { key: 'file-writing-bar-empty', color: 'gray' }, '░'.repeat(40 - Math.floor((fileWritingProgress || 0) / 2.5))),
            ]),
          ]) : null,
        ]) : null,
        
        // Step 10: Final Completion with Setup Instructions
        currentStep === 10 ? React.createElement(Box, { key: 'step10', flexDirection: 'column', marginTop: 2 }, [
          React.createElement(Text, { key: 'step10-title', color: 'green', bold: true }, '🎉 Setup Complete!'),
          React.createElement(Text, { key: 'step10-subtitle', color: 'cyan', bold: true }, 'Your agent is now connected and ready to use.'),
          
          // Setup Instructions Box
          setupInstructions ? React.createElement(Box, { key: 'setup-instructions', borderStyle: 'single', borderColor: 'green', padding: 1, marginTop: 2, flexDirection: 'column' }, [
            React.createElement(Text, { key: 'instructions-title', color: 'green', bold: true, marginBottom: 1 }, setupInstructions.title),
            
            // SDK Installation
            React.createElement(Box, { key: 'sdk-section', marginBottom: 1 }, [
              React.createElement(Text, { key: 'sdk-label', color: 'yellow', bold: true }, '📦 Install SDK:'),
              React.createElement(Text, { key: 'sdk-command', color: 'white', marginLeft: 2 }, `   ${setupInstructions.sdkInstall}`)
            ]),
            
            // API Key Setup
            React.createElement(Box, { key: 'api-section', marginBottom: 1 }, [
              React.createElement(Text, { key: 'api-label', color: 'yellow', bold: true }, '🔑 Set API Key:'),
              React.createElement(Text, { key: 'api-command', color: 'white', marginLeft: 2 }, `   export HANDIT_API_KEY=${setupInstructions.apiKey}`)
            ]),
            
            // Run Command
            React.createElement(Box, { key: 'run-section', marginBottom: 1 }, [
              React.createElement(Text, { key: 'run-label', color: 'yellow', bold: true }, '🚀 Run Agent:'),
              React.createElement(Text, { key: 'run-command', color: 'white', marginLeft: 2 }, `   ${setupInstructions.runCommand}`)
            ]),
            
            // API Keys Info
            React.createElement(Box, { key: 'keys-section', marginTop: 1 }, [
              React.createElement(Text, { key: 'keys-label', color: 'cyan', bold: true }, '🔧 API Keys:'),
              React.createElement(Text, { key: 'staging-key', color: 'gray', marginLeft: 2 }, `   Staging: ${setupInstructions.stagingApiToken}`),
              React.createElement(Text, { key: 'production-key', color: 'gray', marginLeft: 2 }, `   Production: ${setupInstructions.productionApiToken}`)
            ]),
            
            // Final Message
            React.createElement(Text, { key: 'final-message', color: 'green', bold: true, marginTop: 1 }, '✅ Your autonomous engineer is ready!'),
            React.createElement(Text, { key: 'dashboard-link', color: 'gray', marginTop: 1 }, '   Traces will appear in your dashboard at https://dashboard.handit.ai')
          ]) : null,
          
          React.createElement(Text, { key: 'step10-exit', color: 'gray', marginTop: 2 }, 'Setup complete! Closing in 3 seconds...'),
        ]) : null,
        
        // Error message
        error ? React.createElement(Box, { key: 'error', marginTop: 2 }, [
          React.createElement(Text, { key: 'error-text', color: 'red' }, `❌ ${error}`),
        ]) : null,
        
        // Instructions
        currentStep < 4 ? React.createElement(Box, { key: 'instructions', marginTop: 3 }, [
          React.createElement(Text, { key: 'help-text', color: 'gray', dimColor: true }, 
            currentStep === 1 ? 'Enter agent name, then press Enter to continue' :
            currentStep === 2 ? 'Enter entry file path, then press Enter to continue' :
            'Enter entry function name, then press Enter to continue'
          ),
        ]) : null,
      ]);
    }

    render(React.createElement(ModularSetupWizard), {
      exitOnCtrlC: false,
      patchConsole: false,
      stdout: process.stdout,
      stdin: process.stdin,
      debug: false,
      // Increase buffer size for large inputs
      experimental: true
    });
  });
}

module.exports = { showModularSetupWizard };
