#!/usr/bin/env node
/**
 * Comprehensive test runner for Handit Agent Scaffolding Service
 */

const path = require('path');
const chalk = require('chalk');

async function runAllTests() {
    console.log(chalk.blue.bold('🧪 Running All Scaffolding Tests\n'));

    const tests = [
        {
            name: 'Standard Scaffolding Tests',
            file: './test-scaffolding.js',
            description: 'Tests all framework combinations with standard configurations'
        },
        {
            name: 'New Node-Based Structure Tests',
            file: './test-new-structure.js', 
            description: 'Tests the new node-based tools and llm_nodes structure'
        },
        {
            name: 'Ultra-Simplified Configuration Tests',
            file: './test-ultra-simple.js',
            description: 'Tests minimal configurations with maximum defaults'
        }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const test of tests) {
        console.log(chalk.yellow(`\n📋 Running: ${test.name}`));
        console.log(chalk.gray(`Description: ${test.description}`));
        console.log(chalk.gray('─'.repeat(60)));

        try {
            totalTests++;
            
            // Import and run the test
            const testModule = require(test.file);
            const testFunction = Object.values(testModule)[0];
            
            if (typeof testFunction === 'function') {
                await testFunction();
                console.log(chalk.green(`✅ ${test.name} - PASSED`));
                passedTests++;
            } else {
                console.log(chalk.red(`❌ ${test.name} - FAILED (No test function found)`));
                failedTests++;
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ ${test.name} - FAILED`));
            console.error(chalk.red(`   Error: ${error.message}`));
            failedTests++;
        }
    }

    // Summary
    console.log(chalk.blue.bold('\n📊 Test Summary'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`Total Tests: ${totalTests}`);
    console.log(chalk.green(`Passed: ${passedTests}`));
    console.log(chalk.red(`Failed: ${failedTests}`));
    
    if (failedTests === 0) {
        console.log(chalk.green.bold('\n🎉 All tests passed! Scaffolding service is ready for production.'));
    } else {
        console.log(chalk.red.bold('\n⚠️  Some tests failed. Please review the errors above.'));
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests };
