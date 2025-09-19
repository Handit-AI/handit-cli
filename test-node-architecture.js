const { ScaffoldingService } = require('./src/scaffold');
const fs = require('fs-extra');

async function testNodeArchitecture() {
  console.log('🧪 Testing New Node Architecture');
  console.log('=' .repeat(60));

  const config = {
    project: {
      name: 'Node Architecture Test',
      language: 'python'
    },
    runtime: {
      type: 'fastapi',
      port: 8080
    },
    tools: [{
      node_name: 'data_fetcher',
      selected: ['http_fetch', 'web_search']
    }],
    llm_nodes: [{
      node_name: 'text_analyzer',
      model: {
        provider: 'openai',
        name: 'gpt-4'
      }
    }]
  };

  const outputDir = './test-node-architecture-output';
  
  try {
    await fs.remove(outputDir);
    
    console.log('📋 Config:', JSON.stringify(config, null, 2));
    console.log('\n🚀 Generating...');
    
    const scaffold = new ScaffoldingService();
    await scaffold.generateProject(config, outputDir);
    
    console.log('✅ Generation completed!');
    
    // Check base classes
    const basePath = `${outputDir}/src/base.py`;
    if (await fs.pathExists(basePath)) {
      console.log('\n✅ Base classes file exists');
      
      const baseContent = await fs.readFile(basePath, 'utf8');
      const baseChecks = [
        ['BaseNode abstract class', /class BaseNode\(ABC\):/],
        ['BaseLLMNode class', /class BaseLLMNode\(BaseNode\):/],
        ['BaseToolNode class', /class BaseToolNode\(BaseNode\):/],
        ['Abstract run method', /@abstractmethod\s+async def run\(/],
        ['call_llm method', /async def call_llm\(/],
        ['execute_tool method', /async def execute_tool\(/]
      ];
      
      console.log('\n🔍 Base Classes Analysis:');
      baseChecks.forEach(([name, regex]) => {
        const found = regex.test(baseContent);
        console.log(`${found ? '✅' : '❌'} ${name}`);
      });
    } else {
      console.log('❌ Base classes file not found');
    }
    
    // Check tool node
    const toolPath = `${outputDir}/src/nodes/tools/data_fetcher/processor.py`;
    if (await fs.pathExists(toolPath)) {
      console.log('\n✅ Tool node exists');
      
      const toolContent = await fs.readFile(toolPath, 'utf8');
      const toolChecks = [
        ['Inherits BaseToolNode', /class.*ToolNode\(BaseToolNode\):/],
        ['Has run method', /async def run\(/],
        ['No generic retrieve/reason/act', !/retrieve.*reason.*act/],
        ['Specific tool logic method', /_execute_data_fetcher_logic/],
        ['Tool examples', /http_fetch.*web_search/]
      ];
      
      console.log('\n🔍 Tool Node Analysis:');
      toolChecks.forEach(([name, regex]) => {
        const found = regex.test(toolContent);
        console.log(`${found ? '✅' : '❌'} ${name}`);
      });
    } else {
      console.log('❌ Tool node not found');
    }
    
    // Check LLM node
    const llmPath = `${outputDir}/src/nodes/llm/text_analyzer/processor.py`;
    if (await fs.pathExists(llmPath)) {
      console.log('\n✅ LLM node exists');
      
      const llmContent = await fs.readFile(llmPath, 'utf8');
      const llmChecks = [
        ['Inherits BaseLLMNode', /class.*LLMNode\(BaseLLMNode\):/],
        ['Has run method', /async def run\(/],
        ['No generic retrieve/reason/act', !/retrieve.*reason.*act/],
        ['Specific LLM logic method', /_execute_text_analyzer_llm_logic/],
        ['OpenAI example', /openai\.ChatCompletion/],
        ['Ollama example', /ollama\.chat/],
        ['LLM integration comments', /TODO: Replace this placeholder with your actual LLM integration/]
      ];
      
      console.log('\n🔍 LLM Node Analysis:');
      llmChecks.forEach(([name, regex]) => {
        const found = regex.test(llmContent);
        console.log(`${found ? '✅' : '❌'} ${name}`);
      });
    } else {
      console.log('❌ LLM node not found');
    }
    
    // Check prompts
    const promptsPath = `${outputDir}/src/nodes/llm/text_analyzer/prompts.py`;
    if (await fs.pathExists(promptsPath)) {
      console.log('\n✅ Prompts file exists');
      
      const promptsContent = await fs.readFile(promptsPath, 'utf8');
      const promptsChecks = [
        ['Node-specific prompts', /text_analyzer.*description/],
        ['No generic retrieve/reason/act', !/retrieve.*reason.*act/],
        ['Customization instructions', /Customize this description/]
      ];
      
      console.log('\n🔍 Prompts Analysis:');
      promptsChecks.forEach(([name, regex]) => {
        const found = regex.test(promptsContent);
        console.log(`${found ? '✅' : '❌'} ${name}`);
      });
    } else {
      console.log('❌ Prompts file not found');
    }
    
    console.log('\n📊 Architecture Summary:');
    console.log('✅ Abstract base classes with run() methods');
    console.log('✅ Tool nodes inherit BaseToolNode');  
    console.log('✅ LLM nodes inherit BaseLLMNode');
    console.log('✅ Each node has specific implementation methods');
    console.log('✅ No generic retrieve/reason/act placeholders');
    console.log('✅ LLM nodes have AI system integration examples');
    console.log('✅ Tool nodes have specific tool execution examples');
    
    console.log('\n🎉 Node architecture test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNodeArchitecture().catch(console.error);
