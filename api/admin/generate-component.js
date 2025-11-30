import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPONENTS_DIR = path.join(__dirname, '..', '..', 'cli-tool', 'components');

// Load best practices and examples
function loadBestPractices() {
  const practicesPath = path.join(__dirname, '..', '..', 'docs', 'CLAUDE.md');
  let bestPractices = '';
  
  try {
    if (fs.existsSync(practicesPath)) {
      bestPractices = fs.readFileSync(practicesPath, 'utf-8').substring(0, 5000);
    }
  } catch (e) {
    console.warn('Could not load best practices file');
  }
  
  return bestPractices;
}

// Load example components for reference
function loadExampleComponents(componentType) {
  const examplesPath = path.join(COMPONENTS_DIR, componentType);
  const examples = [];
  
  try {
    if (fs.existsSync(examplesPath)) {
      const categories = fs.readdirSync(examplesPath).filter(item => {
        const itemPath = path.join(examplesPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      // Get 2-3 examples from different categories
      for (const category of categories.slice(0, 3)) {
        const categoryPath = path.join(examplesPath, category);
        const files = fs.readdirSync(categoryPath)
          .filter(f => f.endsWith('.md') || f.endsWith('.json'))
          .slice(0, 1);
        
        for (const file of files) {
          const filePath = path.join(categoryPath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            examples.push({
              category,
              name: file.replace(/\.(md|json)$/, ''),
              content: content.substring(0, 2000) // Limit size
            });
          } catch (e) {
            // Skip files we can't read
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not load example components');
  }
  
  return examples;
}

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
    const { 
      componentType, 
      description, 
      category, 
      name,
      scrapedContent,
      documentationUrl 
    } = req.body;
    
    // Validation
    if (!componentType || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['componentType', 'description']
      });
    }
    
    const validTypes = ['agents', 'commands', 'mcps', 'settings', 'hooks', 'skills'];
    if (!validTypes.includes(componentType)) {
      return res.status(400).json({ 
        error: 'Invalid component type',
        validTypes
      });
    }
    
    // Check for Anthropic API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return res.status(500).json({
        error: 'ANTHROPIC_API_KEY not configured',
        message: 'Please set ANTHROPIC_API_KEY in your environment variables'
      });
    }
    
    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey
    });
    
    // Load reference materials
    const bestPractices = loadBestPractices();
    const examples = loadExampleComponents(componentType);
    
    // Build the prompt for AI generation
    const skillsDocs = `
## Skills Documentation Reference

Skills are modular capabilities that extend Claude's functionality. Key requirements:

1. **SKILL.md Structure**:
   - Must have YAML frontmatter with \`name\` and \`description\`
   - Description should be specific and include when to use the skill
   - Use imperative/infinitive form (verb-first instructions)
   - Include clear examples

2. **Best Practices**:
   - Keep Skills focused on one capability
   - Write clear descriptions with specific triggers
   - Include both what the Skill does and when to use it
   - Use progressive disclosure for complex content

3. **Component Types**:
   - Agents: AI specialists with expertise areas
   - Commands: Slash commands with clear usage
   - MCPs: Model Context Protocol server configurations
   - Settings: Claude Code configuration settings
   - Hooks: Automation triggers
   - Skills: Modular capabilities with SKILL.md files
`;

    const examplesText = examples.length > 0 
      ? `\n## Example ${componentType}:\n${examples.map(ex => 
          `\n### ${ex.category}/${ex.name}\n\`\`\`\n${ex.content}\n\`\`\``
        ).join('\n')}`
      : '';
    
    const scrapedText = scrapedContent 
      ? `\n## Scraped Content from ${documentationUrl || 'URL'}:\n${scrapedContent.substring(0, 5000)}`
      : '';
    
    const prompt = `You are an expert at creating Claude Code components. Generate a high-quality ${componentType} component based on the following requirements.

## Requirements:
- Component Type: ${componentType}
- Name: ${name || 'auto-generated'}
- Category: ${category || 'general'}
- Description: ${description}

## Reference Documentation:
${skillsDocs}

${bestPractices ? `\n## Best Practices:\n${bestPractices}` : ''}

${examplesText}

${scrapedText}

## Your Task:

Generate a complete, production-ready ${componentType} component that:

1. Follows Claude Code best practices and conventions
2. Matches the style and structure of the examples provided
3. Includes all necessary metadata and frontmatter
4. Has clear, specific instructions
5. Includes practical examples
6. Is ready to use immediately

For ${componentType === 'skills' ? 'Skills' : componentType}:
${componentType === 'skills' 
  ? '- Create a SKILL.md file with proper YAML frontmatter\n- Include name and description fields\n- Write instructions in imperative form\n- Add examples section'
  : componentType === 'agents'
  ? '- Include frontmatter with name, description, tools, model\n- Define expertise areas\n- Provide clear instructions\n- Include usage examples'
  : componentType === 'commands'
  ? '- Include frontmatter with allowed-tools, argument-hint, description\n- Define purpose and usage\n- Provide implementation details\n- Include command examples'
  : componentType === 'mcps'
  ? '- Create valid JSON configuration\n- Include mcpServers object\n- Define command, args, and env variables\n- Add description'
  : componentType === 'settings'
  ? '- Create valid JSON configuration\n- Include description and env variables\n- Define configuration options'
  : '- Create valid JSON configuration\n- Include description and hooks configuration\n- Define trigger conditions'
}

Return ONLY the complete component content, ready to save as a file. Do not include explanations or markdown code blocks around it.`;

    console.log('🤖 Generating component with AI...');
    
    // Generate component using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const generatedContent = message.content[0].text;
    
    // Parse and validate the generated content
    let parsedContent = generatedContent.trim();
    
    // Remove markdown code blocks if present
    if (parsedContent.startsWith('```')) {
      const lines = parsedContent.split('\n');
      const firstLine = lines[0];
      const lastLine = lines[lines.length - 1];
      
      if (firstLine.startsWith('```') && lastLine === '```') {
        parsedContent = lines.slice(1, -1).join('\n');
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        componentType,
        category: category || 'general',
        name: name || 'auto-generated',
        content: parsedContent,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: message.usage?.output_tokens || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error generating component:', error);
    
    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        error: 'Anthropic API authentication failed',
        message: 'Please check your ANTHROPIC_API_KEY'
      });
    }
    
    return res.status(500).json({
      error: 'Failed to generate component',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}



