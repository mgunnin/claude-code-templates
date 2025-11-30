/**
 * Direct test of the scraper function (bypasses HTTP server)
 * Usage: node api/admin/test-scraper-direct.js
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';

// Simulate the scraper handler logic
async function testScrapeUrl(url) {
  console.log(`\n🔍 Testing URL: ${url}`);
  
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    
    // Fetch the URL content
    console.log(`   Fetching content...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
      maxContentLength: 10 * 1024 * 1024,
      maxBodyLength: 10 * 1024 * 1024
    });
    
    console.log(`   ✅ Response received (${response.status})`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    // Check if it's raw content (not HTML)
    if (response.data && typeof response.data === 'string' && !response.data.includes('<!DOCTYPE')) {
      console.log(`   ✅ Raw content detected`);
      return {
        success: true,
        content: response.data,
        isRaw: true,
        url: url
      };
    }
    
    // Parse HTML
    console.log(`   Parsing HTML...`);
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract content
    let extractedContent = {
      title: '',
      description: '',
      content: '',
      codeBlocks: [],
      metadata: {}
    };
    
    // Extract title
    const titleElement = document.querySelector('title') || 
                        document.querySelector('h1') ||
                        document.querySelector('h2');
    extractedContent.title = titleElement?.textContent?.trim() || '';
    
    // Extract description
    const metaDescription = document.querySelector('meta[name="description"]');
    extractedContent.description = metaDescription?.getAttribute('content') || '';
    
    // Extract main content
    const mainContent = document.querySelector('main') ||
                       document.querySelector('article') ||
                       document.querySelector('.content') ||
                       document.querySelector('.markdown-body') ||
                       document.querySelector('#readme') ||
                       document.querySelector('body');
    
    if (mainContent) {
      const contentClone = mainContent.cloneNode(true);
      const elementsToRemove = contentClone.querySelectorAll(
        'script, style, nav, header, footer, .nav, .navigation, .sidebar, .menu'
      );
      elementsToRemove.forEach(el => el.remove());
      
      extractedContent.content = contentClone.textContent?.trim() || '';
      
      // Extract code blocks
      const codeBlocks = contentClone.querySelectorAll('pre code, code');
      extractedContent.codeBlocks = Array.from(codeBlocks)
        .filter(code => {
          const text = code.textContent?.trim() || '';
          return text.length > 0;
        })
        .map(code => {
          let language = 'text';
          const classMatch = code.className.match(/language-(\w+)/);
          const langAttr = code.getAttribute('data-lang') || code.getAttribute('lang');
          const parentPre = code.closest('pre');
          const preClassMatch = parentPre?.className.match(/language-(\w+)/);
          
          language = classMatch?.[1] || langAttr || preClassMatch?.[1] || 'text';
          
          return {
            language: language.toLowerCase(),
            content: code.textContent?.trim() || ''
          };
        });
    }
    
    // Initialize metadata
    extractedContent.metadata = {
      url: url,
      domain: parsedUrl.hostname,
      contentType: response.headers['content-type'],
      scrapedAt: new Date().toISOString()
    };
    
    // GitHub-specific handling
    if (parsedUrl.hostname.includes('github.com') || parsedUrl.hostname.includes('raw.githubusercontent.com')) {
      Object.assign(extractedContent.metadata, { source: 'github' });
      
      if (parsedUrl.hostname.includes('raw.githubusercontent.com')) {
        const rawMatch = parsedUrl.pathname.match(/\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/);
        if (rawMatch) {
          extractedContent.metadata.repository = {
            owner: rawMatch[1],
            name: rawMatch[2]
          };
          extractedContent.metadata.branch = rawMatch[3];
          extractedContent.metadata.filePath = rawMatch[4];
          extractedContent.metadata.fileExtension = rawMatch[4].split('.').pop();
          extractedContent.metadata.isRaw = true;
        }
      } else {
        const repoMatch = parsedUrl.pathname.match(/\/([^\/]+)\/([^\/]+)/);
        if (repoMatch) {
          extractedContent.metadata.repository = {
            owner: repoMatch[1],
            name: repoMatch[2]
          };
        }
        
        const pathMatch = parsedUrl.pathname.match(/\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/(.+)/);
        if (pathMatch) {
          extractedContent.metadata.filePath = pathMatch[1];
          extractedContent.metadata.fileExtension = pathMatch[1].split('.').pop();
          
          const branchMatch = parsedUrl.pathname.match(/\/blob\/([^\/]+)/);
          const branch = branchMatch ? branchMatch[1] : 'main';
          const rawUrl = `https://raw.githubusercontent.com/${extractedContent.metadata.repository.owner}/${extractedContent.metadata.repository.name}/${branch}/${pathMatch[1]}`;
          extractedContent.metadata.rawUrl = rawUrl;
        }
        
        const branchMatch = parsedUrl.pathname.match(/\/blob\/([^\/]+)/);
        if (branchMatch) {
          extractedContent.metadata.branch = branchMatch[1];
        }
        
        if (!parsedUrl.pathname.includes('/blob/') && !parsedUrl.pathname.includes('/tree/')) {
          extractedContent.metadata.isRepoRoot = true;
          
          const fileLinks = document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]');
          if (fileLinks.length > 0) {
            extractedContent.metadata.repoStructure = Array.from(fileLinks)
              .slice(0, 50)
              .map(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim() || '';
                const isFile = href.includes('/blob/');
                const pathMatch = href.match(/\/(blob|tree)\/[^\/]+\/(.+)/);
                
                return {
                  name: text,
                  path: pathMatch ? pathMatch[2] : '',
                  type: isFile ? 'file' : 'directory',
                  url: href.startsWith('http') ? href : `https://github.com${href}`
                };
              })
              .filter(item => item.path);
          }
        }
        
        const markdownBody = document.querySelector('.markdown-body');
        if (markdownBody) {
          const markdownContent = markdownBody.cloneNode(true);
          const scripts = markdownContent.querySelectorAll('script, style');
          scripts.forEach(el => el.remove());
          
          extractedContent.content = markdownContent.textContent?.trim() || extractedContent.content;
          
          const mdCodeBlocks = markdownContent.querySelectorAll('pre code');
          if (mdCodeBlocks.length > 0) {
            extractedContent.codeBlocks = Array.from(mdCodeBlocks).map(code => ({
              language: code.className.match(/language-(\w+)/)?.[1] || 'text',
              content: code.textContent?.trim() || ''
            }));
          }
        }
      }
    }
    
    return {
      success: true,
      data: extractedContent
    };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 Direct Scraper Tests\n');
  console.log('='.repeat(60));
  
  // Test 1: GitHub repository root
  const repoRoot = 'https://github.com/wshobson/agents';
  const repoResult = await testScrapeUrl(repoRoot);
  
  if (repoResult.success) {
    console.log(`\n✅ Repository Root Test:`);
    console.log(`   Title: ${repoResult.data.title || 'N/A'}`);
    console.log(`   Content length: ${repoResult.data.content?.length || 0} chars`);
    console.log(`   Code blocks: ${repoResult.data.codeBlocks?.length || 0}`);
    
    if (repoResult.data.metadata) {
      console.log(`   Metadata:`);
      if (repoResult.data.metadata.repository) {
        console.log(`     Repository: ${repoResult.data.metadata.repository.owner}/${repoResult.data.metadata.repository.name}`);
      }
      if (repoResult.data.metadata.isRepoRoot) {
        console.log(`     Is Repo Root: true`);
      }
      if (repoResult.data.metadata.repoStructure) {
        console.log(`     Repository Structure: ${repoResult.data.metadata.repoStructure.length} items`);
        console.log(`     Sample files:`);
        repoResult.data.metadata.repoStructure
          .filter(item => item.type === 'file')
          .slice(0, 5)
          .forEach(file => {
            console.log(`       - ${file.path}`);
          });
      }
    }
  } else {
    console.log(`\n❌ Repository Root Test Failed: ${repoResult.error}`);
  }
  
  // Test 2: Raw README
  console.log('\n' + '='.repeat(60));
  const readmeRaw = 'https://raw.githubusercontent.com/wshobson/agents/main/README.md';
  const readmeResult = await testScrapeUrl(readmeRaw);
  
  if (readmeResult.success) {
    if (readmeResult.isRaw) {
      console.log(`\n✅ Raw README Test:`);
      console.log(`   Content length: ${readmeResult.content?.length || 0} chars`);
      console.log(`   Preview (first 200 chars):`);
      console.log(`   ${readmeResult.content.substring(0, 200)}...`);
    } else {
      console.log(`\n✅ Raw README Test:`);
      console.log(`   Content length: ${readmeResult.data.content?.length || 0} chars`);
      if (readmeResult.data.metadata) {
        console.log(`   File path: ${readmeResult.data.metadata.filePath || 'N/A'}`);
        console.log(`   Branch: ${readmeResult.data.metadata.branch || 'N/A'}`);
      }
    }
  } else {
    console.log(`\n❌ Raw README Test Failed: ${readmeResult.error}`);
  }
  
  // Test 3: Rendered README
  console.log('\n' + '='.repeat(60));
  const readmeRendered = 'https://github.com/wshobson/agents/blob/main/README.md';
  const renderedResult = await testScrapeUrl(readmeRendered);
  
  if (renderedResult.success) {
    console.log(`\n✅ Rendered README Test:`);
    console.log(`   Title: ${renderedResult.data.title || 'N/A'}`);
    console.log(`   Content length: ${renderedResult.data.content?.length || 0} chars`);
    console.log(`   Code blocks: ${renderedResult.data.codeBlocks?.length || 0}`);
    if (renderedResult.data.codeBlocks && renderedResult.data.codeBlocks.length > 0) {
      console.log(`   Code block languages: ${renderedResult.data.codeBlocks.map(cb => cb.language).join(', ')}`);
    }
  } else {
    console.log(`\n❌ Rendered README Test Failed: ${renderedResult.error}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

