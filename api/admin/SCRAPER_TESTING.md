# Scraper Testing Guide

## Overview

The URL scraper has been enhanced to systematically capture and organize content from GitHub repositories, specifically tested with [wshobson/agents](https://github.com/wshobson/agents).

## Enhancements Made

### 1. GitHub Repository Support

The scraper now handles multiple GitHub URL formats:

- **Repository Root**: `https://github.com/wshobson/agents`
  - Extracts repository structure (files and directories)
  - Identifies README files
  - Captures repository metadata

- **Raw File URLs**: `https://raw.githubusercontent.com/wshobson/agents/main/README.md`
  - Direct file content access
  - Better for markdown and code files
  - No HTML parsing needed

- **Rendered File URLs**: `https://github.com/wshobson/agents/blob/main/README.md`
  - GitHub's rendered markdown view
  - Extracts `.markdown-body` content
  - Preserves code blocks with language detection

### 2. Content Extraction Improvements

- **Structured Metadata**: Repository owner, name, branch, file paths
- **Code Block Detection**: Language detection from multiple sources
- **Repository Structure**: File tree extraction from repository root
- **Markdown Support**: Better handling of GitHub's markdown rendering

### 3. Error Handling

- Rate limit detection (429 errors)
- Timeout handling (30 second timeout)
- Connection error handling
- Content size limits (10MB max)

## Testing Instructions

### Prerequisites

1. **Start the API server**:
```bash
npm run dev:vercel
# Server should be running on http://localhost:3002
```

2. **Set environment variables** (for component generation):
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

### Run Automated Tests

```bash
cd api
npm run test:scraper
```

This will test:
1. ✅ GitHub repository root scraping
2. ✅ GitHub raw README scraping
3. ✅ GitHub rendered README scraping
4. ✅ Component generation from scraped content
5. ✅ Repository structure extraction

### Manual Testing via Admin Panel

1. Navigate to: `http://localhost:3002/admin`
2. Click the **"🔍 Scrape & Generate"** tab
3. Enter a GitHub URL:
   - `https://github.com/wshobson/agents` (repository root)
   - `https://raw.githubusercontent.com/wshobson/agents/main/README.md` (raw file)
   - `https://github.com/wshobson/agents/blob/main/README.md` (rendered file)
4. Click **"🔍 Scrape URL"**
5. Review the scraped content preview
6. Fill in component details:
   - Component Type: `agents`
   - Category: `development-team`
   - Name: `multi-agent-orchestrator`
   - Description: `Multi-agent orchestration system for Claude Code`
7. Click **"🤖 Generate Component"**
8. Review the generated component
9. Click **"✅ Create Component"** to save

### Manual Testing via API

#### Test 1: Scrape Repository Root

```bash
curl -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/wshobson/agents"}' \
  | jq '.data.metadata.repoStructure | length'
```

Expected: Should return number of files/directories found (e.g., 50)

#### Test 2: Scrape Raw README

```bash
curl -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://raw.githubusercontent.com/wshobson/agents/main/README.md"}' \
  | jq '.data.content | length'
```

Expected: Should return content length > 0

#### Test 3: Scrape Rendered README

```bash
curl -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/wshobson/agents/blob/main/README.md"}' \
  | jq '.data.codeBlocks | length'
```

Expected: Should return number of code blocks found

## Expected Results

### Repository Root Scraping

When scraping `https://github.com/wshobson/agents`, you should see:

```json
{
  "success": true,
  "data": {
    "title": "wshobson/agents",
    "description": "Intelligent automation and multi-agent orchestration for Claude Code",
    "content": "...",
    "metadata": {
      "source": "github",
      "repository": {
        "owner": "wshobson",
        "name": "agents"
      },
      "isRepoRoot": true,
      "repoStructure": [
        {
          "name": ".claude-plugin",
          "path": ".claude-plugin",
          "type": "directory",
          "url": "https://github.com/wshobson/agents/tree/main/.claude-plugin"
        },
        {
          "name": "README.md",
          "path": "README.md",
          "type": "file",
          "url": "https://github.com/wshobson/agents/blob/main/README.md"
        }
        // ... more files
      ]
    }
  }
}
```

### Raw File Scraping

When scraping `https://raw.githubusercontent.com/wshobson/agents/main/README.md`:

```json
{
  "success": true,
  "data": {
    "content": "# Claude Code Plugins: Orchestration and Automation\n\n...",
    "metadata": {
      "source": "github",
      "repository": {
        "owner": "wshobson",
        "name": "agents"
      },
      "filePath": "README.md",
      "branch": "main",
      "isRaw": true,
      "rawContent": true
    }
  }
}
```

## Component Generation Workflow

The complete workflow for generating components from GitHub repos:

1. **Scrape** → Extract content and metadata
2. **Generate** → Use AI to create component from scraped content
3. **Create** → Save component file to filesystem

### Example: Creating an Agent from GitHub Repo

```bash
# Step 1: Scrape
SCRAPED=$(curl -s -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://raw.githubusercontent.com/wshobson/agents/main/README.md"}')

# Step 2: Generate (requires ANTHROPIC_API_KEY)
GENERATED=$(curl -s -X POST http://localhost:3002/api/admin/generate-component \
  -H "Content-Type: application/json" \
  -d "{
    \"componentType\": \"agents\",
    \"category\": \"development-team\",
    \"name\": \"multi-agent-orchestrator\",
    \"description\": \"Multi-agent orchestration system\",
    \"scrapedContent\": $(echo $SCRAPED | jq -r '.data.content'),
    \"documentationUrl\": \"https://github.com/wshobson/agents\"
  }")

# Step 3: Create
curl -X POST http://localhost:3002/api/admin/create-component \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"agents\",
    \"category\": \"development-team\",
    \"name\": \"multi-agent-orchestrator\",
    \"description\": \"Multi-agent orchestration system\",
    \"content\": $(echo $GENERATED | jq -r '.data.content')
  }"
```

## Troubleshooting

### Issue: "Could not connect to URL"

**Solution**: Check if the URL is accessible. GitHub URLs should work, but private repos may fail.

### Issue: "Rate limited"

**Solution**: GitHub may rate limit requests. Wait a few minutes and try again.

### Issue: "ANTHROPIC_API_KEY not configured"

**Solution**: Set the environment variable:
```bash
export ANTHROPIC_API_KEY=your-key-here
```

### Issue: Repository structure not found

**Solution**: The scraper looks for links with `/blob/` or `/tree/` in the HTML. If GitHub's HTML structure changes, this may need updating.

## Next Steps

1. ✅ Test with the wshobson/agents repository
2. ✅ Verify repository structure extraction
3. ✅ Test component generation
4. 🔄 Add support for GitHub API (optional enhancement)
5. 🔄 Add batch scraping for multiple files (optional enhancement)

## Files Modified

- `api/admin/scrape-url.js` - Enhanced GitHub support
- `api/admin/test-scraper.js` - Test script
- `api/admin/README.md` - Documentation
- `api/package.json` - Added test script
- `docs/admin.html` - Admin panel UI integration

