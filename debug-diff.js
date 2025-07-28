// Debug script to understand the line number issue
const originalLines = [
  "app.post('/process-document', upload.single('image'), async (req, res) => {",
  "  if (!req.file) {",
  "    return res.status(400).json({ error: 'No image file provided' });",
  "  }",
  "",
  "  console.log(`Processing file: ${req.file.filename}`);",
  "",
  "  // Process the document",
  "  const result = await processDocument(req.file.path);",
  "",
  "  // Clean up the uploaded file",
  "  fs.unlinkSync(req.file.path);",
  "",
  "  res.json({",
  "    success: true,",
  "    data: result",
  "  });",
  "}",
  "",
  "// Additional context after the function",
  "console.log('Server started on port 3000');",
  "app.listen(3000, () => {",
  "  console.log('Document processing service ready');",
  "});"
];

console.log('Original lines with line numbers:');
originalLines.forEach((line, index) => {
  console.log(`${(index + 1).toString().padStart(2)}: ${line}`);
});

console.log('\n---\n');

// Simulate the addition at the end
console.log('After addition at the end:');
console.log('  ...');
console.log('  }');
console.log('+ } finally {');
console.log('+   endTracing(executionId);');
console.log('  }');
console.log('  ');
console.log('  // Additional context after the function');
console.log('  console.log(\'Server started on port 3000\');');
console.log('  app.listen(3000, () => {');
console.log('    console.log(\'Document processing service ready\');');
console.log('  });');

console.log('\nExpected line numbers for context after addition:');
console.log('Original line 17: }');
console.log('Addition: } finally {');
console.log('Addition: endTracing(executionId);');
console.log('Context should start at line 18: // Additional context after the function'); 