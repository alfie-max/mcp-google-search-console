# Google Search Console MCP Server
[![smithery badge](https://smithery.ai/badge/@alfie-max/mcp-google-search-console)](https://smithery.ai/install/@alfie-max/mcp-google-search-console)

A Model Context Protocol (MCP) server that provides tools for interacting with Google Search Console API. This server enables Claude Desktop and other MCP clients to query search performance data, inspect URLs, manage sitemaps, and analyze SEO metrics.

## Features

### Available Tools

1. **search_analytics** - Query search performance data
   - Get clicks, impressions, CTR, and average position
   - Filter by queries, pages, countries, devices
   - Support for date ranges and pagination

2. **list_sites** - List all Search Console properties
   - Shows all properties the service account has access to

3. **url_inspection** - Inspect specific URLs
   - Get indexing status and crawling information
   - Check for issues with specific pages

4. **sitemaps** - Manage sitemap information
   - List all submitted sitemaps
   - Get details about specific sitemaps

5. **quick_insights** - Pre-configured reports
   - Top queries and pages
   - Country and device breakdowns
   - Trending queries and performance over time
   - CTR analysis and position distribution

6. **index_coverage** - Analyze index coverage
   - Get coverage states and issues
   - Monitor indexing health

7. **list_tools** - Get available tools documentation
   - Shows all available tools with examples

## Prerequisites

1. Google Cloud Project with Search Console API enabled
2. Service Account with appropriate credentials
3. Node.js 18+ installed

## Setup

### Installing via Smithery

To install mcp-google-search-console for Claude Desktop automatically via [Smithery](https://smithery.ai/install/@alfie-max/mcp-google-search-console):

```bash
npx -y @smithery/cli install @alfie-max/mcp-google-search-console --client claude
```

### 1. Create a Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the Search Console API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Search Console API"
   - Click Enable

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Grant the role "Search Console API User"
   - Create and download the JSON key file

### 2. Grant Search Console Access

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Go to Settings > Users and permissions
4. Click "Add user"
5. Enter the service account email (found in your JSON credentials)
6. Select permission level (at least "Restricted" for read access)

### 3. Install the MCP Server

```bash
# Clone the repository
git clone <repository-url>
cd mcp-google-search-console

# Install dependencies
npm install
```

### 4. Configure Environment

Create a `.env` file with your credentials:

```env
# Option 1: Direct JSON string
GOOGLE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Option 2: Path to JSON file (modify src/index.js to read from file)
# GOOGLE_CREDENTIALS_PATH=/path/to/credentials.json
```

### 5. Configure Claude Desktop

Add to your Claude Desktop configuration:

#### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
#### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-search-console": {
      "command": "node",
      "args": ["/path/to/mcp-google-search-console/src/index.js"],
      "env": {
        "GOOGLE_CREDENTIALS": "{\"type\":\"service_account\",\"project_id\":\"...\",\"private_key\":\"...\",\"client_email\":\"...\"}"
      }
    }
  }
}
```

## Usage Examples

### Get Search Performance Data
```
Use the search_analytics tool with:
- siteUrl: "https://example.com"
- startDate: "2024-01-01"
- endDate: "2024-01-31"
- dimensions: ["query", "page"]
```

### Get Top Queries Report
```
Use the quick_insights tool with:
- siteUrl: "https://example.com"
- reportType: "top_queries"
- days: 28
```

### Inspect a URL
```
Use the url_inspection tool with:
- siteUrl: "https://example.com"
- inspectionUrl: "https://example.com/specific-page"
```

### List All Properties
```
Use the list_sites tool to see all Search Console properties you have access to
```

## Site URL Formats

Search Console supports different property types:

- **URL-prefix property**: `https://example.com` or `https://example.com/path/`
- **Domain property**: `sc-domain:example.com`
- **URL with protocol**: `http://example.com` (for HTTP-only sites)

## Troubleshooting

### Permission Denied Error
If you get a 403 error, ensure:
1. The service account email is added to Search Console with proper permissions
2. The Search Console API is enabled in Google Cloud Console
3. You're using the correct site URL format

### Authentication Issues
- Verify your GOOGLE_CREDENTIALS environment variable contains valid JSON
- Check that the service account has the necessary roles in Google Cloud Console
- Ensure the private key in credentials hasn't been compromised or rotated

### Rate Limiting
The Search Console API has quotas:
- Default: 1,200 queries per minute
- 100 queries per 100 seconds per user
- Plan your queries accordingly

## Development

### Testing the Server
```bash
# Run the server directly
npm start

# Test the connection and all tools
npm test
# or
node test-connection.js
```

### Adding New Tools
1. Add tool registration in `src/index.js`
2. Implement the tool handler function
3. Update this README with the new tool documentation

## API Documentation

- [Search Console API Reference](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Search Analytics Method](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)

## License

ISC
