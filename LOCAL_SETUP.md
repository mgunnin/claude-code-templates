# Local Development Setup Guide

This guide will help you set up this forked repository as your own standalone application for local development.

## Current Git Configuration

Your repository is currently configured as:

- **Origin**: `https://github.com/mgunnin/claude-code-templates.git` (your fork)
- **Upstream**: `https://github.com/davila7/claude-code-templates.git` (original repo)

## Option 1: Keep Fork Connection (Recommended for pulling updates)

If you want to occasionally pull updates from the original repository while developing your own features:

### 1. Keep current remotes as-is

Your current setup is already perfect for this scenario.

### 2. Create a development branch

```bash
git checkout -b development
git push -u origin development
```

### 3. Work on your features

```bash
# Make changes, commit them
git add .
git commit -m "Your feature description"
git push origin development
```

### 4. When you want to sync with upstream (optional)

```bash
# Get latest from original repo
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# Merge into your development branch
git checkout development
git merge main
```

## Option 2: Complete Independence (Your own standalone app)

If you want to completely separate from the original repository:

### 1. Remove upstream remote

```bash
git remote remove upstream
```

### 2. Verify only origin remains

```bash
git remote -v
```

### 3. Update package metadata (in both root and cli-tool)

You'll want to rename the project to make it your own. See the "Renaming the Project" section below.

## Environment Setup

### 1. Create local environment file

```bash
cp .env.example .env
```

### 2. Configure your environment variables in `.env`

Edit `.env` and add your credentials for:

- **Supabase** (for download tracking) - Optional unless you need analytics
- **Neon Database** (for changelog monitoring) - Optional
- **Discord Bot** (if you want Discord integration) - Optional
- Other API keys as needed

**Note**: For local development, you can leave most of these blank unless you're working on specific features that require them.

### 3. Install dependencies

#### Root dependencies (for web interface)

```bash
cd /Users/mgunnin/Developer/06_Projects/claude-code-templates
npm install
```

#### CLI tool dependencies

```bash
cd cli-tool
npm install
```

#### API dependencies

```bash
cd api
npm install
```

## Running the Application Locally

### 1. CLI Tool (Main Application)

```bash
cd cli-tool

# Link for local testing
npm link

# Run the CLI
npx claude-code-templates

# Or test specific features
npx claude-code-templates --analytics
npx claude-code-templates --health-check
npx claude-code-templates --chats
```

### 2. Analytics Dashboard

```bash
cd cli-tool
npm run analytics:start
# Opens at http://localhost:3333
```

### 3. Web Interface (with Vercel)

```bash
cd ..
npm run dev:vercel
# Opens at http://localhost:3002 (or use --listen to specify a different port)
```

### 4. API Development

```bash
cd ..
vercel dev
# API endpoints available at http://localhost:3000/api/*
```

## Testing

### Run all tests

```bash
# CLI tool tests
cd cli-tool
npm test

# API tests
cd ../api
npm test
```

### Run specific test suites

```bash
# In cli-tool/
npm run test:unit
npm run test:integration
npm run test:analytics
npm run test:commands

# Security validation
npm run security-audit
```

## Renaming the Project (Making it Your Own)

If you want to rebrand this as your own application:

### 1. Update root package.json

```bash
cd ..
```

Edit `package.json`:

```json
{
  "name": "your-new-app-name",
  "description": "Your app description",
  "author": "Your Name"
}
```

### 2. Update cli-tool/package.json

```bash
cd cli-tool
```

Edit `package.json`:

```json
{
  "name": "ContextForge",
  "bin": {
    "your-cli-command": "bin/create-claude-config.js",
    "yca": "bin/create-claude-config.js"
  },
  "description": "Your app description",
  "author": "Matt Gunnin"
}
```

### 3. Update README.md

Replace branding, links, and descriptions with your own.

### 4. Update docs/index.html (Web interface)

Update the title, branding, and any references to the original project.

### 5. Update vercel.json (if deploying)

Ensure your deployment configuration matches your new app name.

## Development Workflow

### Recommended Branch Strategy

```bash
# Main branch - stable releases
main

# Development branch - active development
development

# Feature branches - individual features
feature/your-feature-name
```

### Daily Development Flow

```bash
# Start your day
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/new-feature

# Make changes, commit frequently
git add .
git commit -m "Descriptive commit message"

# Push to your fork
git push origin feature/new-feature

# When ready, merge to development
git checkout development
git merge feature/new-feature
git push origin development
```

## Deployment

### Deploy to Vercel (Web + API)

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Publish CLI to npm (if you want to)

```bash
cd cli-tool

# Update version
npm version patch  # or minor, or major

# Login to npm
npm login

# Publish (use your own npm account)
npm publish
```

## Common Issues

### Issue: npm link not working

```bash
cd cli-tool
npm unlink -g claude-code-templates
npm link
```

### Issue: Dependencies not found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tests failing

```bash
# Make sure you're in the right directory
cd cli-tool  # or api
npm test -- --verbose
```

### Issue: Vercel dev not working

```bash
# Make sure you have Vercel CLI installed
npm i -g vercel

# Try running from root directory
cd /Users/mgunnin/Developer/06_Projects/claude-code-templates
vercel dev
```

## Key Files to Customize

When making this your own app, consider customizing:

1. **Branding & Metadata**

   - `README.md` - Main documentation
   - `package.json` files - Project metadata
   - `docs/index.html` - Web interface
   - `cli-tool/src/index.js` - CLI branding/messages

2. **Configuration**

   - `.env` - Your API keys and credentials
   - `vercel.json` - Deployment configuration
   - `cli-tool/package.json` - CLI command names

3. **Components**

   - `cli-tool/components/*` - Add your own agents, commands, etc.
   - `cli-tool/templates/*` - Custom project templates

4. **API Endpoints**
   - `api/*` - Modify or add your own endpoints
   - Consider using your own Supabase/database instance

## Next Steps

1. ✅ **Environment Setup** - Create `.env` file with your credentials
2. ✅ **Install Dependencies** - Run `npm install` in root, cli-tool, and api
3. ✅ **Test Locally** - Run `npm test` in cli-tool and api to ensure everything works
4. ✅ **Run the App** - Use `npm link` in cli-tool and test the CLI
5. ✅ **Make Your First Change** - Modify a component or add a new feature
6. ✅ **Commit & Push** - Start building your own app!

## Questions?

Refer to:

- `WARP.md` - Development guide for Warp
- `CLAUDE.md` - Comprehensive development documentation
- `CONTRIBUTING.md` - Contribution guidelines (adapt for your team)

Happy building! 🚀
