import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Claude documentation for context
function loadClaudeDocumentation() {
  // docs-claude is at project root, api/admin is at api/admin, so go up 2 levels
  const docsDir = path.join(__dirname, '..', '..', 'docs-claude');
  const docs = {};
  
  const docFiles = {
    'subagents': 'subagents.md',
    'skills': 'skills.md',
    'plugins': 'plugins.md',
    'mcp': 'mcp.md',
    'hooks': 'hooks.md'
  };
  
  for (const [key, filename] of Object.entries(docFiles)) {
    const filePath = path.join(docsDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Extract key sections (first 3000 chars for context)
        docs[key] = content.substring(0, 3000);
      }
    } catch (e) {
      console.warn(`Could not load ${filename}:`, e.message);
    }
  }
  
  return docs;
}

/**
 * Analyze scraped content using AI to extract component information
 * @param {Object} scrapedData - The scraped content data
 * @param {string} scrapedData.title - Page title
 * @param {string} scrapedData.content - Main content
 * @param {string} scrapedData.description - Description
 * @param {Array} scrapedData.codeBlocks - Code blocks
 * @param {Object} scrapedData.metadata - Metadata including URL, repository info, etc.
 * @returns {Promise<Object>} AI analysis results
 */
export async function analyzeScrapedContent(scrapedData) {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  
  const anthropic = new Anthropic({
    apiKey: anthropicApiKey
  });
  
  // Load Claude documentation
  const claudeDocs = loadClaudeDocumentation();
  
  // Prepare content for analysis (limit size)
  const contentPreview = scrapedData.content?.substring(0, 8000) || '';
  const title = scrapedData.title || '';
  const description = scrapedData.description || '';
  const url = scrapedData.metadata?.url || '';
  const repoInfo = scrapedData.metadata?.repository || null;
  const repoStructure = scrapedData.metadata?.repoStructure || null;
  
  // Build repository context
  let repoContext = '';
  if (repoInfo) {
    repoContext = `\nRepository: ${repoInfo.owner}/${repoInfo.name}`;
    if (repoStructure && repoStructure.length > 0) {
      const files = repoStructure.filter(item => item.type === 'file').slice(0, 10);
      const dirs = repoStructure.filter(item => item.type === 'directory').slice(0, 5);
      repoContext += `\nRepository Structure:\n`;
      if (dirs.length > 0) {
        repoContext += `Directories: ${dirs.map(d => d.path).join(', ')}\n`;
      }
      if (files.length > 0) {
        repoContext += `Files: ${files.map(f => f.path).join(', ')}\n`;
      }
    }
  }
  
  // Build code blocks context
  let codeContext = '';
  if (scrapedData.codeBlocks && scrapedData.codeBlocks.length > 0) {
    codeContext = `\nCode Blocks Found (${scrapedData.codeBlocks.length}):\n`;
    scrapedData.codeBlocks.slice(0, 3).forEach((cb, i) => {
      codeContext += `\n--- Code Block ${i + 1} (${cb.language}) ---\n${cb.content.substring(0, 500)}\n`;
    });
  }
  
  // Build prompt
  const prompt = `You are an expert at analyzing content and extracting Claude Code component information.

## Claude Code Component Documentation:

### Agents (Subagents):
${claudeDocs.subagents || 'N/A'}

### Skills:
${claudeDocs.skills || 'N/A'}

### MCPs:
${claudeDocs.mcp || 'N/A'}

### Hooks:
${claudeDocs.hooks || 'N/A'}

## Scraped Content to Analyze:

**URL:** ${url}
**Title:** ${title}
**Description:** ${description}
${repoContext}
${codeContext}

**Content Preview:**
${contentPreview}

## Your Task:

Analyze the scraped content and extract Claude Code component information. Return a JSON object with the following structure:

{
  "suggestedComponentType": "agents|commands|mcps|settings|hooks|skills",
  "confidence": 0.0-1.0,
  "suggestedCategory": "category-name (e.g., development-team, security, testing)",
  "suggestedName": "component-name (lowercase, hyphens, max 64 chars)",
  "extractedMetadata": {
    "description": "Brief description (max 1024 chars for skills)",
    "purpose": "What this component does",
    "features": ["feature1", "feature2", ...],
    "tools": ["Read", "Write", ...] (for agents/commands only),
    "model": "sonnet|haiku|opus" (for agents only, optional)
  },
  "repositoryInsights": {
    "relevantFiles": ["path/to/file1", ...],
    "componentStructure": "description of how components are organized",
    "dependencies": ["dependency1", ...]
  },
  "validation": {
    "dataQuality": "high|medium|low",
    "missingFields": ["field1", ...],
    "recommendations": ["recommendation1", ...],
    "warnings": ["warning1", ...]
  },
  "reasoning": "Brief explanation of why these suggestions were made"
}

## Guidelines:

1. **Component Type Detection:**
   - "agents" if it's an AI specialist/subagent
   - "commands" if it's a slash command
   - "mcps" if it's an MCP server configuration
   - "settings" if it's a Claude Code setting
   - "hooks" if it's a hook configuration
   - "skills" if it's a Skill/modular capability

2. **Name Generation:**
   - Use lowercase letters, numbers, and hyphens only
   - Max 64 characters
   - Descriptive and clear
   - Follow kebab-case convention

3. **Category Selection:**
   - Use existing categories when possible (development-team, security, testing, etc.)
   - Suggest new category only if none fit

4. **Description:**
   - For skills: max 1024 characters, include both what it does AND when to use it
   - For others: concise but informative

5. **Validation:**
   - Check if content has enough information
   - Identify missing required fields
   - Provide recommendations for improvement

Return ONLY valid JSON, no markdown formatting or code blocks.`;

  try {
    console.log('🤖 Running AI analysis...');
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const responseText = message.content[0].text.trim();
    
    // Parse JSON response (handle markdown code blocks if present)
    let jsonText = responseText;
    if (responseText.startsWith('```')) {
      const jsonMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    }
    
    const analysis = JSON.parse(jsonText);
    
    // Add metadata about the analysis
    analysis.metadata = {
      analyzedAt: new Date().toISOString(),
      model: 'claude-3-5-sonnet-20241022',
      tokensUsed: message.usage?.output_tokens || 0
    };
    
    return analysis;
    
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Return a basic fallback analysis
    return {
      suggestedComponentType: 'agents',
      confidence: 0.0,
      suggestedCategory: 'general',
      suggestedName: 'component',
      extractedMetadata: {
        description: scrapedData.description || 'Component extracted from scraped content',
        purpose: 'Purpose not determined',
        features: [],
        tools: []
      },
      repositoryInsights: {},
      validation: {
        dataQuality: 'low',
        missingFields: ['AI analysis failed'],
        recommendations: ['Review content manually'],
        warnings: [`AI analysis failed: ${error.message}`]
      },
      reasoning: 'AI analysis encountered an error, using fallback values',
      error: error.message
    };
  }
}

