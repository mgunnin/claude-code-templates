# Admin Panel Documentation

## Overview

The admin panel provides a web-based interface for easily adding and managing Claude Code components (agents, commands, MCPs, settings, and hooks).

## Access

- **Local Development**: 
  - `http://localhost:3002/admin` (when running `npm run dev:vercel` - full API support)
  - `http://localhost:3001/admin` (when running `npm run dev` - frontend only)
- **Production**: `https://aitmpl.com/admin` (after deployment)

## Features

### 1. Component Creation
- **Agents**: Create AI specialist agents with markdown templates
- **Commands**: Add custom slash commands for Claude Code
- **MCPs**: Configure Model Context Protocol integrations (JSON)
- **Settings**: Add Claude Code configuration settings (JSON)
- **Hooks**: Create automation hooks (JSON)

### 2. Catalog Regeneration
- One-click catalog regeneration after adding components
- Updates `docs/components.json` for the website

## Usage

### Adding a Component

1. Navigate to the admin panel
2. Select the component type tab (Agents, Commands, MCPs, Settings, or Hooks)
3. Fill in the form:
   - **Category**: Choose existing category or create new one
   - **Name**: Component name in kebab-case (e.g., `my-awesome-agent`)
   - **Description**: Brief description of the component
   - **Content** (Optional): Full content. If empty, a template will be generated
4. Click "Create [Component Type]"
5. After creating components, click "Regenerate Catalog" to update the website

### Component File Locations

Components are created in:
- Agents: `cli-tool/components/agents/[category]/[name].md`
- Commands: `cli-tool/components/commands/[category]/[name].md`
- MCPs: `cli-tool/components/mcps/[category]/[name].json`
- Settings: `cli-tool/components/settings/[category]/[name].json`
- Hooks: `cli-tool/components/hooks/[category]/[name].json`

## API Endpoints

### POST `/api/admin/create-component`

Creates a new component file.

**Request Body:**
```json
{
  "type": "agents|commands|mcps|settings|hooks",
  "category": "category-name",
  "name": "component-name",
  "description": "Component description",
  "content": "Optional full content (overrides template)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Component created successfully",
  "data": {
    "type": "agents",
    "category": "development-team",
    "name": "my-agent",
    "path": "cli-tool/components/agents/development-team/my-agent.md",
    "filePath": "/full/path/to/file"
  }
}
```

### POST `/api/admin/regenerate-catalog`

Regenerates the components catalog (`docs/components.json`).

**Response:**
```json
{
  "success": true,
  "message": "Catalog regenerated successfully",
  "output": ["Last 20 lines of output"]
}
```

## Security Considerations

⚠️ **Important**: The admin panel currently has no authentication. For production use, you should:

1. Add authentication (e.g., API key, OAuth, or basic auth)
2. Restrict access to authorized users only
3. Add rate limiting to prevent abuse
4. Validate all inputs server-side (already implemented)
5. Consider adding CSRF protection

### Quick Security Fix

Add a simple API key check:

```javascript
// In api/admin/create-component.js and regenerate-catalog.js
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (req.headers['x-admin-api-key'] !== ADMIN_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Then add to `.env`:
```
ADMIN_API_KEY=your-secret-key-here
```

## Future Enhancements

### Planned Features

1. **URL Scraping**: Input a URL and automatically ingest components
   - Parse GitHub repositories
   - Extract component definitions
   - Auto-categorize and validate

2. **Component Editing**: Edit existing components through the UI

3. **Bulk Import**: Upload multiple components via JSON/CSV

4. **Component Preview**: Preview how components will appear on the website

5. **Validation**: Real-time validation of component content

6. **Search & Filter**: Search existing components before creating duplicates

## Development

### Running Locally

```bash
# Start the dev server with full API support (recommended)
npm run dev:vercel

# Access admin panel
open http://localhost:3002/admin

# Or use simple Express server (frontend only, no API)
npm run dev
# Access at http://localhost:3001/admin
```

### Testing

Test the admin panel by:
1. Creating a test component
2. Verifying the file was created in the correct location
3. Regenerating the catalog
4. Checking that the component appears on the website

### Troubleshooting

**Issue**: API endpoints return 404
- **Solution**: Make sure you're using the correct base URL (`/api/admin/...`)

**Issue**: Catalog regeneration fails
- **Solution**: Ensure Python 3 is installed and `generate_components_json.py` is executable

**Issue**: Components not appearing on website
- **Solution**: Regenerate the catalog after creating components

## File Structure

```
docs/
├── admin.html              # Admin panel frontend
api/
└── admin/
    ├── create-component.js    # Component creation API
    └── regenerate-catalog.js  # Catalog regeneration API
```

## Contributing

When adding new features to the admin panel:
1. Follow the existing code style
2. Add validation for all inputs
3. Provide clear error messages
4. Test with all component types
5. Update this documentation

