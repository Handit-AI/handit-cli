const { parse } = require('@babel/parser');
const fs = require('fs');

async function testParse() {
  try {
    console.log('Testing parsing of server.js...');
    const content = await fs.readFile('server.js', 'utf8');
    
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: true
    });
    
    console.log('✅ Parsing successful!');
    console.log('AST type:', ast.type);
    console.log('Number of statements:', ast.program.body.length);
    
  } catch (error) {
    console.error('❌ Parsing failed:', error.message);
    console.error('Error details:', error.stack);
  }
}

testParse(); 