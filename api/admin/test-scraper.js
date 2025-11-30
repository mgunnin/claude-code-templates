/**
 * Test script for the URL scraper
 * Tests scraping GitHub repositories and component generation
 * 
 * Usage: node api/admin/test-scraper.js
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

async function testScrapeUrl(url, description) {
  console.log(`\n🔍 Testing: ${description}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/admin/scrape-url`, {
      url: url
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Success!`);
      console.log(`   Title: ${data.title || 'N/A'}`);
      console.log(`   Description: ${(data.description || '').substring(0, 100)}...`);
      console.log(`   Content length: ${data.content?.length || 0} chars`);
      console.log(`   Code blocks: ${data.codeBlocks?.length || 0}`);
      
      if (data.metadata) {
        console.log(`   Metadata:`);
        if (data.metadata.source) console.log(`     Source: ${data.metadata.source}`);
        if (data.metadata.repository) {
          console.log(`     Repository: ${data.metadata.repository.owner}/${data.metadata.repository.name}`);
        }
        if (data.metadata.filePath) {
          console.log(`     File path: ${data.metadata.filePath}`);
        }
        if (data.metadata.branch) {
          console.log(`     Branch: ${data.metadata.branch}`);
        }
        if (data.metadata.repoStructure) {
          console.log(`     Repository structure: ${data.metadata.repoStructure.length} items found`);
        }
      }
      
      return data;
    } else {
      console.log(`   ❌ Failed: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

async function testGenerateComponent(scrapedData, componentType, category, name, description) {
  console.log(`\n🤖 Testing Component Generation`);
  console.log(`   Type: ${componentType}`);
  console.log(`   Category: ${category}`);
  console.log(`   Name: ${name}`);
  
  try {
    // Combine scraped content
    let scrapedContent = '';
    if (scrapedData.title) scrapedContent += `Title: ${scrapedData.title}\n\n`;
    if (scrapedData.description) scrapedContent += `Description: ${scrapedData.description}\n\n`;
    if (scrapedData.content) scrapedContent += `Content:\n${scrapedData.content.substring(0, 5000)}\n\n`;
    if (scrapedData.codeBlocks && scrapedData.codeBlocks.length > 0) {
      scrapedContent += `Code Blocks:\n${scrapedData.codeBlocks.slice(0, 3).map((cb, i) => 
        `\n--- Code Block ${i + 1} (${cb.language}) ---\n${cb.content.substring(0, 500)}`
      ).join('\n')}`;
    }
    
    const response = await axios.post(`${API_BASE_URL}/api/admin/generate-component`, {
      componentType,
      category,
      name,
      description,
      scrapedContent,
      documentationUrl: scrapedData.metadata?.url || ''
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds for AI generation
    });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Success!`);
      console.log(`   Generated content length: ${data.content?.length || 0} chars`);
      console.log(`   Model: ${data.metadata?.model || 'N/A'}`);
      console.log(`   Tokens used: ${data.metadata?.tokensUsed || 0}`);
      console.log(`   \n   Preview (first 500 chars):`);
      console.log(`   ${data.content.substring(0, 500)}...`);
      return data;
    } else {
      console.log(`   ❌ Failed: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

async function runTests() {
  console.log('🧪 Starting Scraper Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));
  
  // Test 1: GitHub repository root
  const repoRoot = 'https://github.com/wshobson/agents';
  const repoData = await testScrapeUrl(repoRoot, 'GitHub Repository Root');
  
  // Test 2: GitHub README (raw)
  const readmeRaw = 'https://raw.githubusercontent.com/wshobson/agents/main/README.md';
  const readmeData = await testScrapeUrl(readmeRaw, 'GitHub README (Raw)');
  
  // Test 3: GitHub README (rendered)
  const readmeRendered = 'https://github.com/wshobson/agents/blob/main/README.md';
  const readmeRenderedData = await testScrapeUrl(readmeRendered, 'GitHub README (Rendered)');
  
  // Test 4: Generate component from scraped README
  if (readmeData || readmeRenderedData) {
    const dataToUse = readmeData || readmeRenderedData;
    const generated = await testGenerateComponent(
      dataToUse,
      'agents',
      'development-team',
      'multi-agent-orchestrator',
      'A multi-agent orchestration system for Claude Code with 85 specialized agents and workflow coordination'
    );
    
    if (generated) {
      console.log(`\n✅ Component generation test completed successfully!`);
    }
  }
  
  // Test 5: GitHub file structure (if repo root was scraped)
  if (repoData && repoData.metadata?.repoStructure) {
    console.log(`\n📁 Repository Structure Found:`);
    const structure = repoData.metadata.repoStructure;
    const files = structure.filter(item => item.type === 'file');
    const dirs = structure.filter(item => item.type === 'directory');
    
    console.log(`   Files: ${files.length}`);
    console.log(`   Directories: ${dirs.length}`);
    
    // Show some example files
    if (files.length > 0) {
      console.log(`   \n   Example files:`);
      files.slice(0, 5).forEach(file => {
        console.log(`     - ${file.path}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

