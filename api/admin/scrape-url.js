import axios from 'axios';
import { JSDOM } from 'jsdom';
import { analyzeScrapedContent } from './ai-analyzer.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { url, componentType, useAI = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Fetch the URL content
    console.log(`🔍 Scraping URL: ${url}`);
    
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
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      maxContentLength: 10 * 1024 * 1024, // 10MB max
      maxBodyLength: 10 * 1024 * 1024
    });
    
    const html = response.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract content based on URL type
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
    
    // Extract description (meta description or first paragraph)
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
      // Clone to avoid modifying original
      const contentClone = mainContent.cloneNode(true);
      
      // Remove script and style tags, navigation, headers, footers
      const elementsToRemove = contentClone.querySelectorAll(
        'script, style, nav, header, footer, .nav, .navigation, .sidebar, .menu, ' +
        '.advertisement, .ads, .social-share, .comments, .related-posts'
      );
      elementsToRemove.forEach(el => el.remove());
      
      // Extract text content with better formatting
      extractedContent.content = contentClone.textContent?.trim() || '';
      
      // Extract code blocks (both pre>code and standalone code)
      const codeBlocks = contentClone.querySelectorAll('pre code, code');
      extractedContent.codeBlocks = Array.from(codeBlocks)
        .filter(code => {
          // Filter out empty code blocks
          const text = code.textContent?.trim() || '';
          return text.length > 0;
        })
        .map(code => {
          // Try multiple ways to detect language
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
      
      // Extract structured content (headings, lists, paragraphs)
      const headings = contentClone.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        extractedContent.metadata.headings = Array.from(headings).map(h => ({
          level: parseInt(h.tagName.charAt(1)),
          text: h.textContent?.trim() || ''
        }));
      }
      
      // Extract links
      const links = contentClone.querySelectorAll('a[href]');
      if (links.length > 0) {
        extractedContent.metadata.links = Array.from(links)
          .slice(0, 20) // Limit to first 20 links
          .map(a => ({
            text: a.textContent?.trim() || '',
            href: a.getAttribute('href') || ''
          }));
      }
    }
    
    // Initialize metadata
    extractedContent.metadata = {
      url: url,
      domain: parsedUrl.hostname,
      contentType: response.headers['content-type'],
      scrapedAt: new Date().toISOString()
    };
    
    // For GitHub URLs, try to extract more structured data
    if (parsedUrl.hostname.includes('github.com') || parsedUrl.hostname.includes('raw.githubusercontent.com')) {
      // Merge with existing metadata instead of overwriting
      Object.assign(extractedContent.metadata, {
        source: 'github'
      });
      
      // Handle raw GitHub URLs (raw.githubusercontent.com)
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
          
          // For raw files, the content is already the file content
          if (response.data && typeof response.data === 'string' && !response.data.includes('<!DOCTYPE')) {
            extractedContent.content = response.data;
            extractedContent.metadata.rawContent = true;
          }
        }
      } else {
        // Regular GitHub URLs (github.com)
        // Extract repository info
        const repoMatch = parsedUrl.pathname.match(/\/([^\/]+)\/([^\/]+)/);
        if (repoMatch) {
          extractedContent.metadata.repository = {
            owner: repoMatch[1],
            name: repoMatch[2]
          };
        }
        
        // Extract file path if it's a file URL
        const pathMatch = parsedUrl.pathname.match(/\/[^\/]+\/[^\/]+\/blob\/[^\/]+\/(.+)/);
        if (pathMatch) {
          extractedContent.metadata.filePath = pathMatch[1];
          extractedContent.metadata.fileExtension = pathMatch[1].split('.').pop();
          
          // Try to get raw content for better extraction
          const branchMatch = parsedUrl.pathname.match(/\/blob\/([^\/]+)/);
          const branch = branchMatch ? branchMatch[1] : 'main';
          const rawUrl = `https://raw.githubusercontent.com/${extractedContent.metadata.repository.owner}/${extractedContent.metadata.repository.name}/${branch}/${pathMatch[1]}`;
          extractedContent.metadata.rawUrl = rawUrl;
        }
        
        // Extract branch/commit
        const branchMatch = parsedUrl.pathname.match(/\/blob\/([^\/]+)/);
        if (branchMatch) {
          extractedContent.metadata.branch = branchMatch[1];
        }
        
        // Detect if it's a repository root (no /blob/)
        if (!parsedUrl.pathname.includes('/blob/') && !parsedUrl.pathname.includes('/tree/')) {
          extractedContent.metadata.isRepoRoot = true;
          
          // Extract repository structure from the page
          const fileLinks = document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]');
          if (fileLinks.length > 0) {
            extractedContent.metadata.repoStructure = Array.from(fileLinks)
              .slice(0, 50) // Limit to first 50 files/folders
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
              .filter(item => item.path); // Filter out invalid entries
          }
        }
        
        // For GitHub README files, try to get raw content
        if (parsedUrl.pathname.includes('/blob/') && parsedUrl.pathname.match(/README/i)) {
          extractedContent.metadata.isReadme = true;
        }
        
        // Extract GitHub-specific content (markdown rendering)
        const markdownBody = document.querySelector('.markdown-body') || 
                            document.querySelector('[data-target="readme-toc.content"]') ||
                            document.querySelector('.Box-body');
        
        if (markdownBody) {
          // This is a markdown file, extract better content
          const markdownContent = markdownBody.cloneNode(true);
          const scripts = markdownContent.querySelectorAll('script, style, .markdown-toc, .toc, nav');
          scripts.forEach(el => el.remove());
          
          const markdownText = markdownContent.textContent?.trim() || '';
          if (markdownText.length > extractedContent.content.length) {
            extractedContent.content = markdownText;
          }
          
          // Extract code blocks from markdown
          const mdCodeBlocks = markdownContent.querySelectorAll('pre code, .highlight pre code');
          if (mdCodeBlocks.length > 0) {
            const extractedBlocks = Array.from(mdCodeBlocks).map(code => {
              let language = 'text';
              const classMatch = code.className.match(/language-(\w+)/);
              const langAttr = code.getAttribute('data-lang');
              const parentPre = code.closest('pre');
              const preClassMatch = parentPre?.className.match(/language-(\w+)/);
              const highlightMatch = code.closest('.highlight')?.className.match(/highlight-source-(\w+)/);
              
              language = classMatch?.[1] || langAttr || preClassMatch?.[1] || highlightMatch?.[1] || 'text';
              
              return {
                language: language.toLowerCase(),
                content: code.textContent?.trim() || ''
              };
            }).filter(cb => cb.content.length > 0);
            
            if (extractedBlocks.length > 0) {
              extractedContent.codeBlocks = extractedBlocks;
            }
          }
        }
        
        // If we still don't have good content, try to get raw URL and fetch it
        if (extractedContent.content.length < 500 && extractedContent.metadata.rawUrl) {
          try {
            console.log(`   Attempting to fetch raw content from: ${extractedContent.metadata.rawUrl}`);
            const rawResponse = await axios.get(extractedContent.metadata.rawUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/plain,text/*'
              },
              timeout: 10000
            });
            
            if (rawResponse.data && typeof rawResponse.data === 'string' && !rawResponse.data.includes('<!DOCTYPE')) {
              extractedContent.content = rawResponse.data;
              extractedContent.metadata.rawContentFetched = true;
            }
          } catch (rawError) {
            console.log(`   Could not fetch raw content: ${rawError.message}`);
          }
        }
      }
    }
    
    // For documentation sites (like code.claude.com), extract structured content
    if (parsedUrl.hostname.includes('code.claude.com') || parsedUrl.hostname.includes('claude.com')) {
      extractedContent.metadata.source = 'claude-docs';
      
      // Extract sections
      const sections = mainContent?.querySelectorAll('h2, h3');
      if (sections) {
        extractedContent.metadata.sections = Array.from(sections).map(h => ({
          level: h.tagName.toLowerCase(),
          title: h.textContent?.trim() || '',
          id: h.id || ''
        }));
      }
    }
    
    // For markdown files or documentation sites, try to preserve structure
    if (extractedContent.metadata.contentType?.includes('markdown') || 
        parsedUrl.pathname.match(/\.md$/i) ||
        extractedContent.metadata.fileExtension === 'md') {
      extractedContent.metadata.isMarkdown = true;
      
      // Try to extract raw markdown if available
      const markdownContent = document.querySelector('pre, .markdown-body pre, code[class*="language-markdown"]');
      if (markdownContent) {
        extractedContent.metadata.rawMarkdown = markdownContent.textContent?.trim();
      }
    }
    
    // Extract Open Graph and Twitter Card metadata
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) extractedContent.metadata.ogTitle = ogTitle.getAttribute('content');
    if (ogDescription) extractedContent.metadata.ogDescription = ogDescription.getAttribute('content');
    
    // Run AI analysis if requested
    let aiAnalysis = null;
    if (useAI) {
      try {
        console.log('🤖 Running AI analysis on scraped content...');
        aiAnalysis = await analyzeScrapedContent(extractedContent);
        console.log('✅ AI analysis completed');
      } catch (aiError) {
        console.error('⚠️ AI analysis failed, continuing without AI:', aiError.message);
        // Don't fail the entire scrape if AI analysis fails
        aiAnalysis = {
          error: aiError.message,
          warning: 'AI analysis failed, but scraping completed successfully'
        };
      }
    }
    
    // Add AI analysis to response if available
    if (aiAnalysis) {
      extractedContent.aiAnalysis = aiAnalysis;
    }
    
    return res.status(200).json({
      success: true,
      data: extractedContent
    });
    
  } catch (error) {
    console.error('Error scraping URL:', error);
    
    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      let errorMessage = error.response.statusText || 'Failed to fetch URL';
      
      if (status === 403) {
        errorMessage = 'Access forbidden. The website may require authentication or block scrapers.';
      } else if (status === 404) {
        errorMessage = 'Page not found. Please check the URL.';
      } else if (status === 429) {
        errorMessage = 'Rate limited. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Server error. The website may be temporarily unavailable.';
      }
      
      return res.status(status < 500 ? status : 500).json({
        error: 'Failed to fetch URL',
        message: errorMessage,
        status: status
      });
    }
    
    // Handle network errors
    if (error.code === 'ENOTFOUND') {
      return res.status(400).json({
        error: 'Could not resolve URL',
        message: 'The domain name could not be found. Please check the URL.'
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(400).json({
        error: 'Connection refused',
        message: 'Could not connect to the server. Please check the URL.'
      });
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request timeout',
        message: 'The request took too long. The website may be slow or unavailable.'
      });
    }
    
    if (error.code === 'ERR_FR_TOO_MANY_REDIRECTS') {
      return res.status(400).json({
        error: 'Too many redirects',
        message: 'The URL redirects too many times. Please check the URL.'
      });
    }
    
    // Handle axios errors
    if (error.message?.includes('maxContentLength')) {
      return res.status(413).json({
        error: 'Content too large',
        message: 'The page content is too large to scrape. Please try a different URL.'
      });
    }
    
    return res.status(500).json({
      error: 'Failed to scrape URL',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

