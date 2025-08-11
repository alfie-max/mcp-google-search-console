# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for Google Search Console API. It provides Claude Desktop with tools to query search performance data, inspect URLs, manage sitemaps, analyze SEO metrics, and monitor indexing health.

## Architecture

The MCP server (`src/index.js`) implements 7 main tools:
- `search_analytics`: Query search performance data with dimensions, filters, and date ranges
- `list_sites`: List all accessible Search Console properties
- `url_inspection`: Inspect specific URLs for indexing and crawling status
- `sitemaps`: List and get details about sitemaps
- `quick_insights`: Pre-built reports (top queries, pages, countries, devices, trending, CTR analysis)
- `index_coverage`: Analyze index coverage states and issues
- `list_tools`: Documentation of available tools with examples

The server uses:
- `@modelcontextprotocol/sdk` for MCP protocol implementation
- `@googleapis/searchconsole` for Search Console API access
- `google-auth-library` for authentication
- Environment variable `GOOGLE_CREDENTIALS` as JSON string for service account credentials

## Development Commands

```bash
# Run the MCP server
npm start

# Test the connection and all tools
npm test
# or
node test-connection.js

# Run the server directly (same as npm start)
node src/index.js
```

## Configuration

The server requires only one environment variable:
- `GOOGLE_CREDENTIALS`: JSON string containing the complete Google service account credentials

Site URLs are provided dynamically by users in their queries - no configuration needed.

## Key Implementation Details

- All tools require a `siteUrl` parameter to query any Search Console property dynamically
- No environment variable fallback - users must specify the site URL in each query
- The server uses the official Google APIs client library for Node.js
- Enhanced error handling provides specific guidance when permission is denied:
  - Extracts service account email from credentials
  - Provides step-by-step instructions to grant access in Search Console
  - Shows exactly which service account needs to be added
- Support for different property types:
  - URL-prefix: `https://example.com` or `https://example.com/path/`
  - Domain property: `sc-domain:example.com`
  - HTTP-only sites: `http://example.com`

## Quick Insights Report Types

The `quick_insights` tool provides 10 pre-configured report types:
- `top_queries`: Top performing search queries
- `top_pages`: Most visited pages from search
- `countries`: Traffic by country
- `devices`: Device type breakdown
- `search_appearance`: Search feature appearances
- `recent_performance`: Daily performance trends
- `query_position_distribution`: Position analysis for queries
- `page_ctr_analysis`: CTR performance by page
- `mobile_vs_desktop`: Device comparison over time
- `trending_queries`: Queries with changing performance

## API Rate Limits

Search Console API quotas to be aware of:
- Default: 1,200 queries per minute
- 100 queries per 100 seconds per user
- Maximum 25,000 rows per query (configurable via `rowLimit`)

## Adding New Tools

When adding new tools to the server:
1. Register the tool in `src/index.js` using `server.registerTool()`
2. Define the input schema using Zod validators
3. Implement the handler function with proper error handling using `executeWithErrorHandling`
4. Update the `list_tools` function to include the new tool
5. Update this CLAUDE.md and README.md with the new tool documentation