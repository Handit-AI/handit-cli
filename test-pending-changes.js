const { IterativeCodeGenerator } = require('./src/generator/iterativeGenerator');
const chalk = require('chalk');

// Mock data to test the pending changes system
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
}`;

const structuredChanges = {
  additions: [
    {
      line: 1,
      content: "const { startTracing, trackNode, endTracing } = require('./handit_service');"
    },
    {
      line: 2,
      content: "let executionId;"
    },
    {
      line: 3,
      content: "try {"
    },
    {
      line: 4,
      content: "  const tracingResponse = startTracing({ agentName: \"test\" });"
    },
    {
      line: 5,
      content: "  executionId = tracingResponse.executionId;"
    },
    {
      line: 6,
      content: "  trackNode({ nodeType: \"endpoint\", executionId });"
    },
    {
      line: 15,
      content: "  } finally {"
    },
    {
      line: 16,
      content: "    endTracing(executionId);"
    },
    {
      line: 17,
      content: "  }"
    }
  ],
  removals: [
    {
      line: 10,
      content: "  const result = await processDocument(req.file.path);"
    }
  ]
};

async function testPendingChanges() {
  console.log('🔍 Testing Pending Changes System');
  console.log('─'.repeat(80));
  
  // Create a mock generator
  const mockGenerator = {
    pendingChanges: new Map(),
    
    // Simulate storing changes
    storeChange: function(node, originalCode, structuredChanges) {
      const filePath = require('path').resolve(node.file);
      this.pendingChanges.set(filePath, {
        node,
        originalCode,
        structuredChanges,
      });
      console.log(chalk.green(`✓ Queued changes for ${node.name}`));
    },
    
    // Simulate applying all changes
    applyAllPendingChanges: function() {
      console.log(chalk.blue.bold('\n📝 Applying all pending changes...'));
      
      for (const [filePath, change] of this.pendingChanges) {
        console.log(chalk.gray(`Processing ${require('path').basename(filePath)}...`));
        console.log(chalk.green(`✓ Applied changes to ${change.node.name}`));
      }
      
      console.log(chalk.green(`\n✅ Applied ${this.pendingChanges.size} file(s)`));
    }
  };
  
  // Simulate the workflow
  console.log('1. Storing changes for function...');
  mockGenerator.storeChange(mockNode, originalCode, structuredChanges);
  
  console.log('\n2. Storing changes for another function...');
  const mockNode2 = { ...mockNode, name: 'another-function', line: 100 };
  mockGenerator.storeChange(mockNode2, originalCode, structuredChanges);
  
  console.log('\n3. Applying all changes at once...');
  mockGenerator.applyAllPendingChanges();
  
  console.log('\n✅ Pending changes system working correctly!');
}

testPendingChanges().catch(console.error); 