# Admin API Endpoints

Admin endpoints for managing Claude Code components.

## Endpoints

### POST `/api/admin/scrape-url`

Scrapes content from a URL and extracts structured data. Optionally uses AI to analyze and categorize the content.

**Request:**
```json
{
  "url": "https://github.com/wshobson/agents",
  "useAI": true  // Optional, default: false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Repository Title",
    "description": "Description",
    "content": "Extracted content...",
    "codeBlocks": [...],
    "metadata": {
      "source": "github",
      "repository": {
        "owner": "wshobson",
        "name": "agents"
      },
      "filePath": "README.md",
      "branch": "main",
      "repoStructure": [...]
    },
    "aiAnalysis": {
      "suggestedComponentType": "agents",
      "confidence": 0.95,
      "suggestedCategory": "development-team",
      "suggestedName": "multi-agent-orchestrator",
      "extractedMetadata": {
        "description": "Multi-agent orchestration system...",
        "purpose": "Coordinate multiple AI agents...",
        "features": ["agent coordination", "workflow management"],
        "tools": ["Read", "Write", "Bash"],
        "model": "sonnet"
      },
      "repositoryInsights": {
        "relevantFiles": ["plugins/", "agents/"],
        "componentStructure": "Organized by plugin type",
        "dependencies": []
      },
      "validation": {
        "dataQuality": "high",
        "missingFields": [],
        "recommendations": ["Consider adding examples"],
        "warnings": []
      },
      "reasoning": "Content describes a multi-agent system..."
    }
  }
}
```

**AI Analysis Features:**
- Automatic component type detection
- Category suggestion based on content
- Name generation following Claude Code conventions
- Metadata extraction (description, purpose, features, tools)
- Repository structure analysis
- Data quality validation
- Recommendations and warnings

### POST `/api/admin/generate-component`

Generates a component using AI from scraped content.

**Request:**
```json
{
  "componentType": "agents",
  "category": "development-team",
  "name": "multi-agent-orchestrator",
  "description": "Description",
  "scrapedContent": "Content from scraper...",
  "documentationUrl": "https://github.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "componentType": "agents",
    "category": "development-team",
    "name": "multi-agent-orchestrator",
    "content": "Generated component content...",
    "metadata": {
      "generatedAt": "2025-01-XX...",
      "model": "claude-3-5-sonnet-20241022",
      "tokensUsed": 1234
    }
  }
}
```

### POST `/api/admin/create-component`

Creates a component file in the filesystem.

**Request:**
```json
{
  "type": "agents",
  "category": "development-team",
  "name": "my-agent",
  "description": "Description",
  "content": "Component content..."
}
```

## Testing

### Test the Scraper

```bash
# Make sure the API server is running first
npm run dev:vercel

# In another terminal, run the test
cd api
npm run test:scraper

# Or test with a custom API URL
API_BASE_URL=http://localhost:3002 node admin/test-scraper.js
```

### Test with GitHub Repository

The scraper is optimized for GitHub repositories:

1. **Repository Root**: `https://github.com/wshobson/agents`
   - Extracts repository structure
   - Identifies files and directories
   - Gets README content

2. **Raw File URL**: `https://raw.githubusercontent.com/wshobson/agents/main/README.md`
   - Direct file content
   - Better for markdown/code files

3. **Rendered File**: `https://github.com/wshobson/agents/blob/main/README.md`
   - GitHub's rendered view
   - Extracts markdown body content

### Example Workflow

1. Scrape a GitHub repository:
```bash
curl -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/wshobson/agents"}'
```

2. Generate a component from scraped content:
```bash
curl -X POST http://localhost:3002/api/admin/generate-component \
  -H "Content-Type: application/json" \
  -d '{
    "componentType": "agents",
    "category": "development-team",
    "name": "multi-agent-orchestrator",
    "description": "Multi-agent orchestration system",
    "scrapedContent": "...",
    "documentationUrl": "https://github.com/wshobson/agents"
  }'
```

3. Create the component file:
```bash
curl -X POST http://localhost:3002/api/admin/create-component \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agents",
    "category": "development-team",
    "name": "multi-agent-orchestrator",
    "description": "Description",
    "content": "Generated content..."
  }'
```

## Features

### GitHub Support

- ✅ Repository root detection
- ✅ File structure extraction
- ✅ Raw file URL support
- ✅ Rendered markdown extraction
- ✅ Branch/commit detection
- ✅ File path extraction

### Content Extraction

- ✅ Title and description
- ✅ Main content extraction
- ✅ Code block detection
- ✅ Heading structure
- ✅ Link extraction
- ✅ Metadata extraction

### Error Handling

- ✅ Rate limit detection
- ✅ Timeout handling
- ✅ Connection error handling
- ✅ Invalid URL validation
- ✅ Content size limits

## Environment Variables

Required for AI features:

- `ANTHROPIC_API_KEY` - Anthropic API key for AI analysis and component generation
  - Required for `/api/admin/generate-component`
  - Required for AI analysis in `/api/admin/scrape-url` (when `useAI: true`)

Optional:

- `API_BASE_URL` - Base URL for API (default: `http://localhost:3002`)

## AI Features

### AI-Enhanced Scraping

When `useAI: true` is passed to `/api/admin/scrape-url`, the endpoint uses Anthropic Claude to:

1. **Analyze Content**: Understand what the scraped content represents
2. **Detect Component Type**: Automatically identify if it's an agent, command, MCP, etc.
3. **Suggest Category**: Recommend appropriate category based on content
4. **Generate Name**: Create component name following Claude Code conventions
5. **Extract Metadata**: Pull out description, purpose, features, and tools
6. **Analyze Repository**: Understand file structure and organization
7. **Validate Data**: Check data quality and provide recommendations

### Usage Example

```bash
# Scrape with AI analysis
curl -X POST http://localhost:3002/api/admin/scrape-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/wshobson/agents",
    "useAI": true
  }'
```

The response includes an `aiAnalysis` field with all suggestions and validation results.

