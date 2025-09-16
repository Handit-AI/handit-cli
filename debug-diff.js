#!/usr/bin/env node

/**
 * Debug script for testing diff computation
 */

const { SimplifiedCodeGenerator } = require('./src/generator/simplifiedGenerator');
const fs = require('fs');
const path = require('path');

async function testDiffComputation() {
  console.log('🔍 Testing diff computation...\n');

  // Create test content
  const originalContent = `"""Main LangGraph workflow for loan risk analysis."""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.risk_analysis_workflow.state import WorkflowState
from src.risk_analysis_workflow.nodes import (
    node_intake_and_classify,
    node_extract_per_type,
    node_get_identity,
    node_check_crossdoc,
    node_check_fraud_signals,
    node_score_and_reasons,
    node_compose_assistant_reply
)

def create_workflow() -> StateGraph:
    """Create the loan risk analysis workflow."""
    workflow = StateGraph(WorkflowState)
    return workflow

class Workflow:
    def __init__(self):
        self.workflow = create_workflow()

    def run(self, files: list, messages: list = None, options: dict = None) -> Dict[str, Any]:
        return self.workflow.invoke({"files": files, "messages": messages, "options": options})`;

  const modifiedContent = `"""Main LangGraph workflow for loan risk analysis."""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.risk_analysis_workflow.state import WorkflowState
from src.risk_analysis_workflow.nodes import (
    node_intake_and_classify,
    node_extract_per_type,
    node_get_identity,
    node_check_crossdoc,
    node_check_fraud_signals,
    node_score_and_reasons,
    node_compose_assistant_reply
)
from handit_ai import configure, tracing
import os

configure(HANDIT_API_KEY=os.getenv("HANDIT_API_KEY"))

def create_workflow() -> StateGraph:
    """Create the loan risk analysis workflow."""
    workflow = StateGraph(WorkflowState)
    return workflow

class Workflow:
    def __init__(self):
        self.workflow = create_workflow()

    @tracing(agent="test")
    def run(self, files: list, messages: list = None, options: dict = None) -> Dict[str, Any]:
        return self.workflow.invoke({"files": files, "messages": messages, "options": options})`;

  try {
    // Initialize generator
    const generator = new SimplifiedCodeGenerator('python', 'test-agent', __dirname);
    
    console.log('📋 Original content:');
    console.log(originalContent);
    console.log('\n📋 Modified content:');
    console.log(modifiedContent);
    
    // Split into lines
    const originalLines = originalContent.split('\n').map(line => line || '');
    const modifiedLines = modifiedContent.split('\n').map(line => line || '');
    
    console.log('\n🔍 Computing diff...');
    const changes = generator.computeSmartDiff(originalLines, modifiedLines);
    
    console.log('\n📊 Diff results:');
    console.log(`Total changes: ${changes.length}`);
    
    changes.forEach((change, index) => {
      console.log(`${index + 1}. ${change.type} (line ${change.line}): ${change.content}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }

  // Check if debug log was created
  const debugLogPath = path.join(__dirname, 'debug-code-generation.log');
  if (fs.existsSync(debugLogPath)) {
    console.log('\n📋 Debug log created at:', debugLogPath);
    console.log('📄 Debug log contents:');
    console.log('─'.repeat(50));
    
    try {
      const logContent = fs.readFileSync(debugLogPath, 'utf8');
      console.log(logContent);
    } catch (error) {
      console.log('❌ Could not read debug log:', error.message);
    }
  } else {
    console.log('\n⚠️  No debug log file found at:', debugLogPath);
  }
}

// Run the test
testDiffComputation().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});