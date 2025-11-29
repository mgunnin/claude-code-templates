# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Claude Code Templates is a comprehensive ecosystem for Anthropic's Claude Code, providing ready-to-use AI agents, custom commands, settings, hooks, MCPs (Model Context Protocol integrations), and project templates. The project consists of:

- **CLI Tool** (`cli-tool/`) - Node.js installer/manager for components
- **Web Interface** (`docs/`) - Interactive browsing at aitmpl.com
- **API** (`api/`) - Vercel Serverless Functions for tracking, Discord bot, changelog monitoring
- **Component Catalog** (600+ agents, 200+ commands, 100+ MCPs, settings, hooks, skills)

## Development Commands

### CLI Tool Development
```bash
# Install dependencies
cd cli-tool && npm install

# Local testing
npm link                              # Link for local development
npx claude-code-templates             # Test CLI interactively

# Run tests
npm test                              # Run Jest test suite
npm run test:watch                    # Watch mode
npm run test:coverage                 # With coverage report
npm run test:unit                     # Unit tests only
npm run test:integration              # Integration tests
npm run test:commands                 # Shell script command tests

# Code quality
npm run security-audit                # Run security validation
npm run security-audit:json           # Generate JSON report

# Analytics dashboard (monitoring tool)
npm run analytics:start               # Start at http://localhost:3333
```

### API Development
```bash
cd api

# Install API dependencies
npm install

# Run API tests (CRITICAL before deploy)
npm test                              # All tests
npm run test:api                      # Critical endpoints only
npm run test:coverage                 # With coverage

# Test against production
API_BASE_URL=https://aitmpl.com npm run test:api
```

### Python Scripts (Component Generation)
```bash
# Generate component catalog from cli-tool/components/
python generate_components_json.py    # Creates docs/components.json

# Generate trending data
python generate_trending_data.py

# Manage Claude Code Jobs
python generate_claude_jobs.py
```

### Vercel Deployment
```bash
# Development
npm run dev                           # Start Vercel dev server

# Deployment (MUST test API first)
cd api && npm test                    # CRITICAL: test before deploy
vercel --prod                         # Deploy to production

# Monitoring
vercel logs aitmpl.com --follow       # Real-time logs
vercel ls                             # List deployments
```

## Architecture

### Modular Component System

The core architecture revolves around **component types** that extend Claude Code:

1. **Agents** (`cli-tool/components/agents/`) - AI specialists organized by category:
   - `development-team/` - Frontend, backend, fullstack developers
   - `domain-experts/` - Security, performance, accessibility
   - `business-team/` - Product managers, analysts
   - Format: Markdown files with instructions for Claude

2. **Commands** (`cli-tool/components/commands/`) - Custom slash commands:
   - `code-generation/`, `analysis/`, `testing/`, `deployment/`
   - Format: Markdown files defining command behavior

3. **MCPs** (`cli-tool/components/mcps/`) - External service integrations:
   - `database/`, `integration/`, `cloud/`, `ai-services/`
   - Format: JSON files with MCP server configurations

4. **Settings** (`cli-tool/components/settings/`) - Claude Code configurations:
   - `performance/`, `security/`, `ui/`, `statusline/`
   - Format: JSON configuration files
   - **Special**: Statuslines can include Python scripts auto-installed to `.claude/scripts/`

5. **Hooks** (`cli-tool/components/hooks/`) - Automation triggers:
   - `git/`, `development/`, `testing/`, `notifications/`
   - Format: JSON files defining event triggers

6. **Skills** (`cli-tool/components/skills/`) - Reusable capabilities with progressive disclosure

### CLI Installation Flow

```
User runs: npx claude-code-templates@latest --agent security-auditor --yes

1. CLI (cli-tool/bin/create-claude-config.js) parses arguments
2. installMultipleComponents() in src/index.js handles installation
3. Downloads component from GitHub raw URL
4. Installs to appropriate location (.claude/, CLAUDE.md, .mcp.json)
5. Tracks download via POST to /api/track-download-supabase
6. Component appears in user's Claude Code environment
```

### API Infrastructure

**Critical Endpoints** (deployed as Vercel Serverless Functions):

- `/api/track-download-supabase` - Tracks component installations (Supabase)
- `/api/discord/interactions` - Discord bot slash commands
- `/api/claude-code-check` - Monitors Claude Code releases (Neon DB, cron every 30min)

**Environment Variables** (configured in Vercel Dashboard):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Download tracking
- `NEON_DATABASE_URL` - Changelog monitoring
- `DISCORD_APP_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_WEBHOOK_URL_CHANGELOG`

### Component Generation Pipeline

1. **Developer adds/modifies components** in `cli-tool/components/`
2. **Security validation** runs: `npm run security-audit:json` (in cli-tool/)
3. **Python generation script** scans components: `python generate_components_json.py`
4. **Output**: `docs/components.json` (used by web interface at aitmpl.com)
5. **Web interface** renders catalog with download stats from Supabase

**Key Detail**: Python scripts (`.py` files) are excluded from public listings but downloaded as dependencies for statuslines.

## Important Patterns

### Path Handling
- **Always use relative paths** for project-local files (e.g., `.claude/scripts/`)
- **Never hardcode** user home directories or absolute paths
- Use `path.join()` for cross-platform compatibility

### Python Command Platform Detection
The codebase handles Python command variations across platforms:
- Windows: `py`, `python`, `python3` (in that order)
- Unix/Linux/macOS: `python3`, `python`

Function: `getPlatformPythonCandidates()` and `replacePythonCommands()` in `cli-tool/src/index.js`

### Component Installation Special Cases

**Statuslines with Python Scripts**:
```javascript
// In cli-tool/src/index.js:installIndividualSetting()
if (settingName.includes('statusline/')) {
  const pythonFileName = settingName.split('/')[1] + '.py';
  const pythonUrl = githubUrl.replace('.json', '.py');
  // Downloads both .json and .py, installs .py to .claude/scripts/
}
```

### Testing Requirements

**Before API Deployment** (CRITICAL):
```bash
cd api
npm test                              # All tests must pass
npm run test:api                      # Verify critical endpoints
```

**API Tests Validate**:
- All endpoints respond (< 500 status)
- Download tracking accepts valid component types
- Invalid data returns 400 errors
- CORS headers present
- Response times acceptable

## File Structure

```
claude-code-templates/
├── cli-tool/                         # CLI tool and components
│   ├── bin/                          # CLI entry point
│   ├── src/                          # CLI implementation
│   │   ├── index.js                  # Main CLI logic
│   │   ├── analytics.js              # Analytics dashboard server
│   │   ├── analytics/                # Modular analytics (state, cache, websocket)
│   │   ├── chats-mobile.js           # Mobile chat interface
│   │   ├── health-check.js           # Installation diagnostics
│   │   ├── plugin-dashboard.js       # Plugin management UI
│   │   ├── security-audit.js         # Component validation
│   │   └── utils/                    # Utilities
│   ├── components/                   # Component catalog
│   │   ├── agents/                   # 600+ AI specialists
│   │   ├── commands/                 # 200+ slash commands
│   │   ├── mcps/                     # 100+ integrations
│   │   ├── settings/                 # Configurations
│   │   ├── hooks/                    # Automation triggers
│   │   ├── skills/                   # Reusable capabilities
│   │   └── sandbox/                  # Sandbox environments
│   ├── templates/                    # Project templates
│   ├── tests/                        # Jest tests
│   └── package.json
├── api/                              # Vercel Serverless Functions
│   ├── track-download-supabase.js    # Download tracking (CRITICAL)
│   ├── discord/                      # Discord bot handlers
│   ├── claude-code-check.js          # Changelog monitor (cron)
│   ├── __tests__/                    # API tests
│   └── package.json
├── docs/                             # Web interface (aitmpl.com)
│   ├── index.html
│   ├── js/
│   └── components.json               # Generated component catalog
├── scripts/                          # Build/deployment scripts
├── generate_components_json.py       # Component catalog generator
├── generate_trending_data.py
├── generate_claude_jobs.py
├── vercel.json                       # Vercel configuration
├── package.json                      # Root package (web build)
├── CLAUDE.md                         # Comprehensive project docs
├── CONTRIBUTING.md                   # Contribution guidelines
└── README.md
```

## Common Workflows

### Adding a New Component

1. **Create component file**:
   ```bash
   cd cli-tool/components/agents/[category]/
   touch new-agent.md
   ```

2. **Write component** (see CONTRIBUTING.md for structure)

3. **Validate security**:
   ```bash
   cd cli-tool
   npm run security-audit
   ```

4. **Regenerate catalog**:
   ```bash
   python generate_components_json.py
   ```

5. **Test installation**:
   ```bash
   npm link
   npx claude-code-templates --agent [category]/new-agent --dry-run
   ```

6. **Commit and push** (download tracking happens automatically on publish)

### Modifying API Endpoints

1. **Edit endpoint** in `api/`
2. **Test locally**:
   ```bash
   cd api
   npm test
   ```
3. **Test against production** (if modifying existing):
   ```bash
   API_BASE_URL=https://aitmpl.com npm run test:api
   ```
4. **Deploy**:
   ```bash
   vercel --prod
   ```
5. **Monitor logs**:
   ```bash
   vercel logs aitmpl.com --follow
   ```

### Updating Component Catalog

When components are added/modified, the web interface needs updating:

```bash
# Run security validation first
cd cli-tool && npm run security-audit:json

# Generate new catalog
python generate_components_json.py

# Deploy to Vercel (updates aitmpl.com)
vercel --prod
```

## Key Files to Understand

- **`cli-tool/src/index.js`** - Main CLI entry point, component installation logic
- **`cli-tool/src/analytics.js`** - Analytics dashboard server (WebSocket, real-time monitoring)
- **`generate_components_json.py`** - Scans components, generates docs/components.json
- **`api/track-download-supabase.js`** - Critical for download statistics
- **`vercel.json`** - Deployment config, cron jobs, rewrites
- **`CLAUDE.md`** - Comprehensive development guide (read for deep dive)

## Testing Strategy

### CLI Tool Tests
- **Unit**: `npm run test:unit` - Individual module tests
- **Integration**: `npm run test:integration` - Module interaction tests
- **E2E**: `npm run test:e2e` - Complete user scenarios
- **Analytics**: `npm run test:analytics` - Analytics module tests
- **Commands**: `npm run test:commands` - Shell-based command tests

### API Tests (CRITICAL)
Always run before deployment:
```bash
cd api && npm test
```

Validates all endpoints, CORS, response times, error handling.

### Component Validation
```bash
cd cli-tool
npm run security-audit                # Human-readable output
npm run security-audit:json           # Machine-readable (for catalog)
```

Checks:
- Markdown syntax errors
- Dangerous patterns (hardcoded secrets, absolute paths)
- JSON schema compliance
- File integrity

## Deployment Checklist

### CLI Tool (npm publish)
1. `cd cli-tool`
2. `npm test` (all tests pass)
3. `npm run security-audit` (no critical issues)
4. `npm version patch|minor|major`
5. `git push --tags`
6. GitHub Actions publishes to npm automatically

### API/Web (Vercel)
1. `cd api && npm test` (CRITICAL - must pass)
2. `python generate_components_json.py` (update catalog if needed)
3. `vercel --prod`
4. `vercel logs aitmpl.com --follow` (monitor for errors)
5. Test key endpoints manually

## Emergency Rollback

If deployment breaks critical functionality:

```bash
vercel ls                             # List deployments
vercel inspect <deployment-url>       # Check previous deployment
vercel promote <previous-deployment>  # Rollback to working version
```

Or via Vercel Dashboard → Deployments → "..." → Promote to Production

## Additional Tools

The CLI includes development tools beyond component installation:

- **Analytics Dashboard** (`--analytics`) - Real-time Claude Code session monitoring at localhost:3333
- **Chat Monitor** (`--chats`) - Mobile interface for viewing conversations
- **Health Check** (`--health-check`) - Installation diagnostics
- **Plugin Dashboard** (`--plugins`) - Manage installed plugins

These are full-featured web applications with WebSocket support, caching, and responsive UIs.

## Security Considerations

- **Never hardcode** API keys, tokens, or credentials in components
- **Validate all inputs** in CLI and API
- **Use environment variables** for sensitive configuration
- **Run `npm audit`** regularly in both cli-tool/ and api/
- **Review security-audit** output before publishing components
- **Implement CORS** for all API endpoints
- **Use HTTPS** for production API calls

## Notes for Future Development

- Component download tracking is essential for analytics - breaking `/api/track-download-supabase` affects all installations
- Python scripts in statuslines are dependencies, not standalone components
- The CLI supports both CommonJS and ES modules (api/ uses ESM)
- Vercel cron jobs only run in production, not dev/preview
- The analytics dashboard uses a modular architecture (StateCalculator, ProcessDetector, ConversationAnalyzer, FileWatcher, DataCache)
- WebSocket server provides real-time updates for dashboard and chat monitor
