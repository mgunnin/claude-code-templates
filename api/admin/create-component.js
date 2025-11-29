import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to components directory (relative to project root)
const COMPONENTS_DIR = path.join(__dirname, '..', '..', 'cli-tool', 'components');

// Component type configurations
const COMPONENT_TEMPLATES = {
  agents: (name, category, description, content) => {
    const frontmatter = `---
name: ${name}
description: ${description}
tools: Read, Write, Edit, Bash
model: sonnet
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${description}

## Expertise
- Domain-specific knowledge
- Key capabilities
- Use cases

## Instructions
Detailed instructions for Claude on how to act as this agent.

## Examples
Practical examples of agent usage.
`;
    return content || frontmatter;
  },
  
  commands: (name, category, description, content) => {
    const frontmatter = `---
allowed-tools: Read, Write, Edit, Bash
argument-hint: [arguments]
description: ${description}
---

# /${name}

${description}

## Purpose
What this command accomplishes.

## Usage
\`/${name} [arguments]\`

## Implementation
Technical details of what the command does.

## Examples
\`/${name} example-usage\`
`;
    return content || frontmatter;
  },
  
  mcps: (name, category, description, content) => {
    const defaultConfig = {
      mcpServers: {
        [name.replace(/-/g, '_')]: {
          description: description,
          command: "npx",
          args: ["-y", "@your-org/mcp-server"],
          env: {
            "API_KEY": "<YOUR_API_KEY>",
            "BASE_URL": "https://api.service.com"
          }
        }
      }
    };
    
    if (content) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch (e) {
        return JSON.stringify(defaultConfig, null, 2);
      }
    }
    return JSON.stringify(defaultConfig, null, 2);
  },
  
  settings: (name, category, description, content) => {
    const defaultConfig = {
      description: description,
      env: {
        "SETTING_KEY": "default_value"
      }
    };
    
    if (content) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch (e) {
        return JSON.stringify(defaultConfig, null, 2);
      }
    }
    return JSON.stringify(defaultConfig, null, 2);
  },
  
  hooks: (name, category, description, content) => {
    const defaultConfig = {
      description: description,
      hooks: {
        "PostToolUse": [
          {
            "matcher": "Edit|MultiEdit|Write",
            "hooks": [
              {
                "type": "command",
                "command": "echo 'Hook executed'"
              }
            ]
          }
        ]
      }
    };
    
    if (content) {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch (e) {
        return JSON.stringify(defaultConfig, null, 2);
      }
    }
    return JSON.stringify(defaultConfig, null, 2);
  },
  
  skills: (name, category, description, content) => {
    const frontmatter = `---
name: ${name}
description: ${description}
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${description}

## Overview

[Describe what this skill enables]

## When to Use

[Describe when Claude should use this skill]

## How to Use

[Describe how Claude should use this skill and its resources]
`;
    return content || frontmatter;
  }
};

const COMPONENT_EXTENSIONS = {
  agents: '.md',
  commands: '.md',
  mcps: '.json',
  settings: '.json',
  hooks: '.json',
  skills: '.md'
};

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
    const { type, category, name, description, content } = req.body;
    
    // Validation
    if (!type || !category || !name || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['type', 'category', 'name', 'description']
      });
    }
    
    // Plugins are handled separately (they're JSON entries in marketplace.json)
    if (type === 'plugins') {
      return res.status(400).json({ 
        error: 'Plugins must be created manually in .claude-plugin/marketplace.json',
        note: 'Plugins are collections of other components, not individual files'
      });
    }
    
    if (!COMPONENT_TEMPLATES[type]) {
      return res.status(400).json({ 
        error: 'Invalid component type',
        validTypes: Object.keys(COMPONENT_TEMPLATES)
      });
    }
    
    // Sanitize name (kebab-case)
    const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const sanitizedCategory = category.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Build file path
    const extension = COMPONENT_EXTENSIONS[type];
    let componentDir, filePath;
    
    // Skills are stored in category/skill-name/SKILL.md structure
    if (type === 'skills') {
      componentDir = path.join(COMPONENTS_DIR, type, sanitizedCategory, sanitizedName);
      filePath = path.join(componentDir, 'SKILL.md');
    } else {
      componentDir = path.join(COMPONENTS_DIR, type, sanitizedCategory);
      filePath = path.join(componentDir, `${sanitizedName}${extension}`);
    }
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ 
        error: 'Component already exists',
        path: path.relative(process.cwd(), filePath)
      });
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }
    
    // Generate content
    const template = COMPONENT_TEMPLATES[type];
    const fileContent = template(sanitizedName, sanitizedCategory, description.trim(), content);
    
    // Write file
    fs.writeFileSync(filePath, fileContent, 'utf-8');
    
    return res.status(201).json({
      success: true,
      message: 'Component created successfully',
      data: {
        type,
        category: sanitizedCategory,
        name: sanitizedName,
        path: path.relative(process.cwd(), filePath),
        filePath: filePath
      }
    });
    
  } catch (error) {
    console.error('Error creating component:', error);
    return res.status(500).json({
      error: 'Failed to create component',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

