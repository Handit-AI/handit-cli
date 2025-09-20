/**
 * Use Case Executor for Custom JS Agent
 * Executes use cases defined in JSON format against the agent
 */

import fs from 'fs-extra';
import path from 'path';
import Config from '../config.js';
import { LangGraphAgent } from '../agent.js';

export class UseCaseExecutor {
  constructor(config = null) {
    this.config = config || new Config();
    this.agent = null;
    this.results = [];
  }

  async loadAgent() {
    if (this.agent === null) {
      this.agent = new LangGraphAgent(this.config);
    }
  }

  async executeUseCase(useCase) {
    try {
      console.log(`\n🧪 Running use case: ${useCase.name}`);
      console.log(`📝 Description: ${useCase.description}`);
      
      const startTime = Date.now();
      const result = await this.agent.process(useCase.input);
      const endTime = Date.now();
      
      const executionResult = {
        useCase: useCase.name,
        description: useCase.description,
        input: useCase.input,
        output: result,
        executionTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        status: 'success'
      };
      
      this.results.push(executionResult);
      
      console.log(`✅ Use case completed in ${executionResult.executionTime}ms`);
      
      return executionResult;
    } catch (error) {
      console.error(`❌ Error executing use case ${useCase.name}:`, error.message);
      
      const executionResult = {
        useCase: useCase.name,
        description: useCase.description,
        input: useCase.input,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      
      this.results.push(executionResult);
      return executionResult;
    }
  }

  async executeUseCasesFromFile(filePath) {
    try {
      const useCaseData = await fs.readJson(filePath);
      
      if (!useCaseData.use_cases || !Array.isArray(useCaseData.use_cases)) {
        console.error(`Invalid use case file format: ${filePath}`);
        return;
      }
      
      console.log(`\n📋 Processing ${useCaseData.use_cases.length} use cases from ${path.basename(filePath)}`);
      
      for (const useCase of useCaseData.use_cases) {
        await this.executeUseCase(useCase);
      }
      
    } catch (error) {
      console.error(`Error reading use case file ${filePath}:`, error.message);
    }
  }

  generateReport() {
    const totalUseCases = this.results.length;
    const successfulUseCases = this.results.filter(r => r.status === 'success').length;
    const failedUseCases = this.results.filter(r => r.status === 'error').length;
    
    const totalExecutionTime = this.results
      .filter(r => r.executionTime)
      .reduce((sum, r) => sum + r.executionTime, 0);
    
    return {
      summary: {
        total: totalUseCases,
        successful: successfulUseCases,
        failed: failedUseCases,
        successRate: totalUseCases > 0 ? (successfulUseCases / totalUseCases * 100).toFixed(2) : 0,
        totalExecutionTime: totalExecutionTime,
        averageExecutionTime: totalUseCases > 0 ? (totalExecutionTime / totalUseCases).toFixed(2) : 0
      },
      results: this.results
    };
  }

  printReport() {
    const report = this.generateReport();
    
    console.log(`\n📊 Use Case Execution Report`);
    console.log(`═`.repeat(50));
    console.log(`📈 Summary:`);
    console.log(`  Total use cases: ${report.summary.total}`);
    console.log(`  Successful: ${report.summary.successful}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Success rate: ${report.summary.successRate}%`);
    console.log(`  Total execution time: ${report.summary.totalExecutionTime}ms`);
    console.log(`  Average execution time: ${report.summary.averageExecutionTime}ms`);
    
    if (report.summary.failed > 0) {
      console.log(`\n❌ Failed use cases:`);
      report.results
        .filter(r => r.status === 'error')
        .forEach(result => {
          console.log(`  - ${result.useCase}: ${result.error}`);
        });
    }
  }
}