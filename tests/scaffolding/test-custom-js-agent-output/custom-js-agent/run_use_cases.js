#!/usr/bin/env node
/**
 * Use Case Runner for Custom JS Agent
 * Executes use cases defined in JSON files
 */

import fs from 'fs-extra';
import path from 'path';
import { UseCaseExecutor } from './src/utils/use_case_executor.js';

async function findUseCaseFiles(directory) {
  const files = [];
  
  if (await fs.pathExists(directory)) {
    const items = await fs.readdir(directory);
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await findUseCaseFiles(fullPath));
      } else if (item.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function listUseCaseFiles() {
  const useCaseFiles = await findUseCaseFiles('./use_cases');
  
  if (useCaseFiles.length === 0) {
    console.log('No use case files found in ./use_cases directory');
    return;
  }
  
  console.log('Found use case files:');
  useCaseFiles.forEach(file => console.log(`  - ${file}`));
}

async function runUseCases() {
  const useCaseFiles = await findUseCaseFiles('./use_cases');
  
  if (useCaseFiles.length === 0) {
    console.log('No use case files found');
    return;
  }
  
  const executor = new UseCaseExecutor();
  await executor.loadAgent();
  
  for (const file of useCaseFiles) {
    console.log(`\nRunning use cases from: ${file}`);
    await executor.executeUseCasesFromFile(file);
  }
  
  executor.printReport();
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list') || args.includes('-l')) {
    await listUseCaseFiles();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('Use Case Runner');
    console.log('Usage: node run_use_cases.js [options]');
    console.log('Options:');
    console.log('  --list, -l    List available use case files');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Without options, runs all use cases found in ./use_cases directory');
  } else {
    await runUseCases();
  }
}

// Check if this file is being run directly
if (import.meta.url === 'file://' + process.argv[1]) {
  main().catch(console.error);
}

export { findUseCaseFiles, listUseCaseFiles, runUseCases };