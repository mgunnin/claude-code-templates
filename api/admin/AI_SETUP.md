# AI Configuration for Component Generation

## Overview

The scraper system uses **Anthropic's Claude API** to generate Claude Code components from scraped content.

## AI Model Used

- **Model**: `claude-3-5-sonnet-20241022`
- **Provider**: Anthropic
- **Purpose**: Generate component content (agents, commands, MCPs, settings, hooks, skills) from scraped documentation

## Setup Instructions

### 1. Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 2. Add to Environment Variables

Add to your `.env` file in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### 3. For Local Development

If running with `vercel dev` or `npm run dev:vercel`, make sure your `.env` file is in the project root:

```bash
# Project root
.env
```

### 4. For Production (Vercel)

Add the environment variable in Vercel Dashboard:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your API key
   - **Environment**: Production, Preview, Development (select all)

## Usage

The AI is used automatically when you:

1. **Scrape a URL** → Extract content
2. **Generate Component** → Uses Claude to create component from scraped content
3. **Create Component** → Saves the generated component

### API Endpoint

The AI generation happens in:
- **Endpoint**: `POST /api/admin/generate-component`
- **File**: `api/admin/generate-component.js`

### What the AI Does

When generating a component, Claude:

1. **Analyzes** the scraped content
2. **Understands** the component type and requirements
3. **References** best practices and examples
4. **Generates** a complete, production-ready component
5. **Formats** according to Claude Code conventions

### Example Prompt Structure

The AI receives:
- Component type (agents, commands, MCPs, etc.)
- Category and name
- Description
- Scraped content from URL
- Best practices documentation
- Example components for reference

## Cost Considerations

- **Model**: Claude 3.5 Sonnet
- **Max Tokens**: 4,000 per generation
- **Typical Cost**: ~$0.003-0.015 per component generation
- **Free Tier**: Anthropic offers free credits for new accounts

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"

**Solution**: Add `ANTHROPIC_API_KEY` to your `.env` file

### Error: "Anthropic API authentication failed"

**Solution**: 
1. Check your API key is correct
2. Ensure it starts with `sk-ant-`
3. Verify you have credits/quota available

### Error: Rate limit exceeded

**Solution**: 
- Anthropic has rate limits based on your plan
- Wait a few minutes and try again
- Consider upgrading your plan if needed

## Alternative AI Options

Currently, the system only supports Anthropic Claude. To add support for other AI providers:

1. Modify `api/admin/generate-component.js`
2. Replace the Anthropic SDK import
3. Update the API call logic
4. Adjust prompt formatting if needed

### Potential Alternatives

- **OpenAI GPT-4**: Similar capabilities
- **Anthropic Claude Haiku**: Faster, cheaper, but less capable
- **Local Models**: Ollama, LM Studio (requires more setup)

## Testing Without AI

You can test the scraper without AI:

1. **Scrape URL** → Works without AI (just extracts content)
2. **Manual Component Creation** → Use admin panel to create components manually
3. **Skip Generation** → Provide your own component content

The AI is only needed for the **"Generate Component"** step in the workflow.

