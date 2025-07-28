const { IterativeCodeGenerator } = require('./src/generator/iterativeGenerator');

// Mock data to test the diff system
const mockNode = {
  name: 'process-document',
  file: 'server.js',
  line: 64
};

const originalCode = `app.post('/process-document', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  console.log(\`Processing file: \${req.file.filename}\`);

  // Process the document
  const result = await processDocument(req.file.path);

  // Clean up the uploaded file
  fs.unlinkSync(req.file.path);

  res.json({
    success: true,
    data: result
  });
}

// Additional context after the function
console.log('Server started on port 3000');
app.listen(3000, () => {
  console.log('Document processing service ready');
});`;

const structuredChanges = {
  additions: [
    {
      line: 1,
      content: "import { startTracing, trackNode, endTracing } from '@handit.ai/node';"
    },
    {
      line: 1,
      content: "app.post('/process-document', upload.single('image'), async (req, res) => {"
    },
    {
      line: 6,
      content: "    console.log(`Processing file: ${req.file.filename}`);"
    },
    {
      line: 9,
      content: "    const result = await processDocument(req.file.path, executionId);"
    },
    {
      line: 16,
      content: "    await trackNode({"
    },
    {
      line: 17,
      content: "      input: req.file.path,"
    },
    {
      line: 18,
      content: "      output: result,"
    },
    {
      line: 19,
      content: "      nodeName: 'process-document',"
    },
    {
      line: 20,
      content: "      agentName: 'my-agent',"
    },
    {
      line: 21,
      content: "      nodeType: 'tool',"
    },
    {
      line: 22,
      content: "      executionId"
    },
    {
      line: 23,
      content: "    });"
    },
    {
      line: 33,
      content: "  } finally {"
    },
    {
      line: 34,
      content: "    await endTracing({ executionId, agentName: 'my-agent' });"
    },
    {
      line: 35,
      content: "  }"
    }
  ],
  removals: [
    {
      line: 1,
      content: "app.post('/process-document', upload.single('image'), async (req, res) => {"
    },
    {
      line: 9,
      content: "  const result = await processDocument(req.file.path);"
    },
    {
      line: 33,
      content: "}"
    }
  ]
};

async function testDiff() {
  // Create a mock generator without OpenAI dependency
  const mockGenerator = {
    showStructuredDiff: function(node, originalCode, structuredChanges) {
      const chalk = require('chalk');
      
      // Dark theme styling - similar to the image
      console.log(chalk.bgBlack.white('─'.repeat(80)));
      console.log(chalk.bgBlack.cyan.bold(`🔍 Code Changes for ${node.name}`));
      console.log(chalk.bgBlack.white('─'.repeat(80)));
      
      const originalLines = originalCode.split('\n');
      
      // Summary section with dark background
      console.log(chalk.bgBlack.yellow.bold('📊 Summary:'));
      console.log(chalk.bgBlack.green(`  + ${structuredChanges.additions.length} lines added`));
      console.log(chalk.bgBlack.red(`  - ${structuredChanges.removals.length} lines removed\n`));
      
      // Create unified changes
      const changes = [];
      
      // Process additions
      structuredChanges.additions.forEach(addition => {
        changes.push({
          type: 'addition',
          line: addition.line,
          content: addition.content
        });
      });
      
      // Process removals
      structuredChanges.removals.forEach(removal => {
        changes.push({
          type: 'removal',
          line: removal.line,
          content: removal.content
        });
      });
      
      // Sort by line number
      const unifiedChanges = changes.sort((a, b) => a.line - b.line);
      
      if (unifiedChanges.length === 0) return;
      
      console.log(chalk.bgBlack.yellow.bold('\n📋 Changes:'));
      console.log(chalk.bgBlack.white('─'.repeat(80)));
      
      const contextLines = 4;
      let lastContextEnd = -1;
      
      unifiedChanges.forEach((change, index) => {
        const lineNumber = change.line;
        const contextStart = Math.max(0, lineNumber - contextLines - 1);
        const contextEnd = Math.min(originalLines.length - 1, lineNumber + contextLines - 1);
        
        // Add separator if there's a gap
        if (lastContextEnd >= 0 && contextStart > lastContextEnd + 1) {
          console.log(chalk.bgBlack.gray('   ...'));
        }
        
        // Show context before change
        const contextBeforeStart = Math.max(lastContextEnd + 1, contextStart);
        if (contextBeforeStart < lineNumber) {
          for (let i = contextBeforeStart; i < lineNumber; i++) {
            const lineContent = originalLines[i] || '';
            console.log(chalk.bgBlack.white(`${(i + 1).toString().padStart(3)}: ${lineContent}`));
          }
        }
        
        // Show the change
        if (change.type === 'addition') {
          console.log(chalk.bgGreen.black(`${lineNumber.toString().padStart(3)}: + ${change.content}`));
        } else if (change.type === 'removal') {
          console.log(chalk.bgRed.white(`${lineNumber.toString().padStart(3)}: - ${change.content}`));
        }
        
        // Show context after change
        const contextAfterStart = lineNumber;
        const contextAfterEnd = Math.min(originalLines.length, contextEnd + 1);
        if (contextAfterStart < contextAfterEnd) {
          for (let i = contextAfterStart; i < contextAfterEnd; i++) {
            const lineContent = originalLines[i] || '';
            console.log(chalk.bgBlack.white(`${(i + 1).toString().padStart(3)}: ${lineContent}`));
          }
          lastContextEnd = contextAfterEnd - 1;
        } else {
          lastContextEnd = lineNumber - 1;
        }
      });
      
      console.log(chalk.bgBlack.white('─'.repeat(80)));
    }
  };
  
  console.log('🔍 Testing Improved Diff System');
  console.log('─'.repeat(80));
  
  mockGenerator.showStructuredDiff(mockNode, originalCode, structuredChanges);
}

testDiff().catch(console.error); 