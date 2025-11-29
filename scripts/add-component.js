#!/usr/bin/env node

/**
 * CLI tool to easily add new components (agents, commands, MCPs, settings, hooks)
 * Usage: node scripts/add-component.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const COMPONENTS_DIR = path.join(__dirname, '..', 'cli-tool', 'components');

// Component type configurations
const COMPONENT_TYPES = {
  agents: {
    extension: '.md',
    template: (name, category, description) => `---
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
`
  },
  commands: {
    extension: '.md',
    template: (name, category, description) => `---
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
`
  },
  mcps: {
    extension: '.json',
    template: (name, category, description) => JSON.stringify({
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
    }, null, 2)
  },
  settings: {
    extension: '.json',
    template: (name, category, description) => JSON.stringify({
      description: description,
      env: {
        "SETTING_KEY": "default_value"
      }
    }, null, 2)
  },
  hooks: {
    extension: '.json',
    template: (name, category, description) => JSON.stringify({
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
    }, null, 2)
  }
};

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function getCategories(componentType) {
  const typePath = path.join(COMPONENTS_DIR, componentType);
  if (!fs.existsSync(typePath)) {
    return [];
  }
  return fs.readdirSync(typePath)
    .filter(item => {
      const itemPath = path.join(typePath, item);
      return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
    })
    .sort();
}

async function main() {
  console.log('\n🚀 Add New Component\n');
  console.log('This tool will help you create a new component file.\n');

  // Step 1: Choose component type
  console.log('Available component types:');
  Object.keys(COMPONENT_TYPES).forEach((type, index) => {
    console.log(`  ${index + 1}. ${type}`);
  });
  
  const typeChoice = await question('\nSelect component type (1-5): ');
  const typeIndex = parseInt(typeChoice) - 1;
  const componentType = Object.keys(COMPONENT_TYPES)[typeIndex];
  
  if (!componentType) {
    console.error('❌ Invalid selection');
    rl.close();
    process.exit(1);
  }

  // Step 2: Choose or create category
  const categories = getCategories(componentType);
  console.log(`\n📁 Available categories for ${componentType}:`);
  if (categories.length > 0) {
    categories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat}`);
    });
    console.log(`  ${categories.length + 1}. Create new category`);
  } else {
    console.log('  (No existing categories)');
  }
  
  const categoryChoice = await question(`\nSelect category (1-${categories.length + 1}): `);
  const categoryIndex = parseInt(categoryChoice) - 1;
  
  let category;
  if (categoryIndex < categories.length) {
    category = categories[categoryIndex];
  } else {
    // Create new category
    const newCategory = await question('Enter new category name (kebab-case): ');
    category = newCategory.trim();
  }

  // Step 3: Component name
  const name = await question('\nComponent name (kebab-case, e.g., my-awesome-agent): ');
  const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '-');

  // Step 4: Description
  const description = await question('Description: ');

  // Step 5: Confirm and create
  const config = COMPONENT_TYPES[componentType];
  const filePath = path.join(COMPONENTS_DIR, componentType, category, `${sanitizedName}${config.extension}`);
  
  console.log('\n📝 Summary:');
  console.log(`  Type: ${componentType}`);
  console.log(`  Category: ${category}`);
  console.log(`  Name: ${sanitizedName}`);
  console.log(`  File: ${path.relative(process.cwd(), filePath)}`);
  
  const confirm = await question('\nCreate this component? (y/n): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Cancelled');
    rl.close();
    return;
  }

  // Create directory if it doesn't exist
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${path.relative(process.cwd(), dirPath)}`);
  }

  // Create file with template
  const content = config.template(sanitizedName, category, description.trim());
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Created component file: ${path.relative(process.cwd(), filePath)}`);

  // Ask about regenerating catalog
  const regenerate = await question('\nRegenerate components.json catalog? (y/n): ');
  if (regenerate.toLowerCase() === 'y') {
    console.log('\n🔄 Regenerating components.json...');
    const { execSync } = require('child_process');
    try {
      execSync('python3 generate_components_json.py', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('✅ Catalog regenerated successfully!');
    } catch (error) {
      console.log('⚠️  Could not regenerate catalog automatically. Run manually:');
      console.log('   python3 generate_components_json.py');
    }
  }

  console.log('\n✨ Done! Your component is ready.');
  console.log(`\nNext steps:`);
  console.log(`  1. Edit the file: ${path.relative(process.cwd(), filePath)}`);
  console.log(`  2. Test it locally`);
  console.log(`  3. Commit: git add ${path.relative(process.cwd(), filePath)}`);
  console.log(`  4. Commit: git commit -m "feat: Add ${sanitizedName} ${componentType.slice(0, -1)}"\n`);

  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

