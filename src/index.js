#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Use environment variables for authentication
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const serviceAccountEmail = credentials.client_email;

// Initialize Google Auth
const auth = new GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters']
});

// Get auth client for direct API calls
const authClient = await auth.getClient();

const server = new McpServer({
  name: 'google-search-console-mcp',
  version: '1.0.0',
});

// Helper function to handle errors with helpful messages
async function executeWithErrorHandling(fn, siteUrl) {
  try {
    return await fn();
  } catch (error) {

    // Handle permission errors specifically
    if (error.code === 403 || error.message?.includes('permission') || error.message?.includes('forbidden')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Permission denied for this Search Console property',
            siteUrl: siteUrl,
            serviceAccountEmail: serviceAccountEmail,
            solution: `The service account needs access to this Search Console property`,
            possibleCauses: [
              'The property exists but the service account has no access',
              'The property has not been added to Search Console yet',
              'The property URL format is incorrect'
            ],
            instructions: 'Follow these steps to resolve:',
            steps: [
              'OPTION A: If the property already exists in Search Console:',
              '1. Go to Google Search Console (https://search.google.com/search-console)',
              `2. Select the property: ${siteUrl}`,
              '3. Click Settings (⚙️) in the left sidebar',
              '4. Click "Users and permissions"',
              '5. Click "Add user" button',
              `6. Enter this email: ${serviceAccountEmail}`,
              '7. Select permission level: "Restricted" (sufficient for read access)',
              '8. Click "Add"',
              '',
              'OPTION B: If the property does not exist in Search Console:',
              '1. Go to Google Search Console (https://search.google.com/search-console)',
              '2. Click "Add property" button',
              `3. Enter your website URL: ${siteUrl}`,
              '4. Choose property type (URL-prefix or Domain)',
              '5. Click "Continue" and verify ownership',
              '6. After verification, follow Option A steps above',
              '',
              'Then wait 5-10 minutes for permissions to propagate and try again'
            ],
            originalError: error.message
          }, null, 2)
        }]
      };
    }

    // Handle rate limiting errors
    if (error.code === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Search Console API rate limit exceeded',
            siteUrl: siteUrl,
            solution: 'You have exceeded the API quota limits',
            instructions: 'Try these solutions:',
            steps: [
              '1. Wait a few minutes before trying again',
              '2. Reduce the frequency of your queries',
              '3. Use smaller date ranges or fewer dimensions',
              '4. Check API quotas in Google Cloud Console'
            ],
            quotaLimits: {
              'Queries per minute': '1,200',
              'Queries per 100 seconds per user': '100',
              'Daily queries': 'Varies by project'
            },
            originalError: error.message
          }, null, 2)
        }]
      };
    }
    
    // Handle other errors
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to fetch Search Console data',
          message: error.message,
          siteUrl: siteUrl
        }, null, 2)
      }]
    };
  }
}

// Tool 1: Search Analytics - Get search performance data
server.registerTool('search_analytics', {
  title: 'Search Analytics',
  description: 'Query search performance data including impressions, clicks, CTR, and position',
  inputSchema: {
    siteUrl: z.string().describe('The site URL (e.g., https://example.com or sc-domain:example.com)'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    dimensions: z.array(z.enum(['query', 'page', 'country', 'device', 'searchAppearance', 'date']))
      .optional()
      .describe('Dimensions to group by'),
    dimensionFilterGroups: z.array(z.object({
      filters: z.array(z.object({
        dimension: z.enum(['query', 'page', 'country', 'device', 'searchAppearance']),
        operator: z.enum(['equals', 'notEquals', 'contains', 'notContains']),
        expression: z.string()
      }))
    })).optional().describe('Filter groups for dimensions'),
    type: z.enum(['web', 'image', 'video', 'news', 'discover', 'googleNews']).optional().default('web'),
    aggregationType: z.enum(['auto', 'byPage', 'byProperty']).optional().default('auto'),
    rowLimit: z.number().optional().default(1000).describe('Number of rows to return (max 25000)'),
    startRow: z.number().optional().default(0).describe('Starting row for pagination')
  }
}, async ({ siteUrl, startDate, endDate, dimensions, dimensionFilterGroups, type, aggregationType, rowLimit, startRow }) => {
  if (!siteUrl) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Site URL is required',
          example: 'siteUrl: "https://example.com" or "sc-domain:example.com"',
          instruction: 'Please provide the Search Console property URL'
        }, null, 2)
      }]
    };
  }

  return executeWithErrorHandling(async () => {
    const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: startDate,
        endDate: endDate,
        dimensions: dimensions,
        dimensionFilterGroups: dimensionFilterGroups,
        type: type,
        aggregationType: aggregationType,
        rowLimit: rowLimit,
        startRow: startRow
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  }, siteUrl);
});

// Tool 2: List Sites - Get all Search Console properties
server.registerTool('list_sites', {
  title: 'List Sites',
  description: 'List all Search Console properties the service account has access to',
  inputSchema: {}
}, async () => {
  return executeWithErrorHandling(async () => {
    const response = await authClient.request({
      url: 'https://searchconsole.googleapis.com/webmasters/v3/sites'
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          sites: response.data.siteEntry || [],
          count: response.data.siteEntry?.length || 0
        }, null, 2)
      }]
    };
  }, 'all sites');
});

// Tool 3: URL Inspection - Inspect a specific URL
server.registerTool('url_inspection', {
  title: 'URL Inspection',
  description: 'Inspect a specific URL to get indexing and crawling information',
  inputSchema: {
    siteUrl: z.string().describe('The site URL (e.g., https://example.com)'),
    inspectionUrl: z.string().describe('The URL to inspect'),
    languageCode: z.string().optional().default('en').describe('Language code for translated messages')
  }
}, async ({ siteUrl, inspectionUrl, languageCode }) => {
  if (!siteUrl || !inspectionUrl) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Both siteUrl and inspectionUrl are required',
          example: {
            siteUrl: 'https://example.com',
            inspectionUrl: 'https://example.com/page'
          }
        }, null, 2)
      }]
    };
  }

  return executeWithErrorHandling(async () => {
    const response = await searchConsoleClient.urlInspection.index.inspect({
      requestBody: {
        siteUrl: siteUrl,
        inspectionUrl: inspectionUrl,
        languageCode: languageCode
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  }, siteUrl);
});

// Tool 4: Sitemaps - List and get sitemap information
server.registerTool('sitemaps', {
  title: 'Sitemaps',
  description: 'List all sitemaps or get information about a specific sitemap',
  inputSchema: {
    siteUrl: z.string().describe('The site URL (e.g., https://example.com)'),
    sitemapPath: z.string().optional().describe('Specific sitemap path to get details (optional)'),
    action: z.enum(['list', 'get']).default('list').describe('Action to perform')
  }
}, async ({ siteUrl, sitemapPath, action }) => {
  if (!siteUrl) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Site URL is required',
          example: 'siteUrl: "https://example.com"'
        }, null, 2)
      }]
    };
  }

  return executeWithErrorHandling(async () => {
    if (action === 'get' && sitemapPath) {
      const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapPath)}`
    });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }]
      };
    } else {
      const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`
    });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sitemaps: response.data.sitemap || [],
            count: response.data.sitemap?.length || 0
          }, null, 2)
        }]
      };
    }
  }, siteUrl);
});

// Tool 5: Quick Insights - Pre-built reports for common queries
server.registerTool('quick_insights', {
  title: 'Quick Insights',
  description: 'Get pre-configured reports for common Search Console insights',
  inputSchema: {
    siteUrl: z.string().describe('The site URL (e.g., https://example.com)'),
    reportType: z.enum([
      'top_queries',
      'top_pages',
      'countries',
      'devices',
      'search_appearance',
      'recent_performance',
      'query_position_distribution',
      'page_ctr_analysis',
      'mobile_vs_desktop',
      'trending_queries'
    ]).describe('Type of report to generate'),
    days: z.number().optional().default(28).describe('Number of days to look back (default: 28)')
  }
}, async ({ siteUrl, reportType, days }) => {
  if (!siteUrl) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Site URL is required',
          example: 'siteUrl: "https://example.com"'
        }, null, 2)
      }]
    };
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const reports = {
    top_queries: {
      dimensions: ['query'],
      rowLimit: 25
    },
    top_pages: {
      dimensions: ['page'],
      rowLimit: 25
    },
    countries: {
      dimensions: ['country'],
      rowLimit: 25
    },
    devices: {
      dimensions: ['device'],
      rowLimit: 10
    },
    search_appearance: {
      dimensions: ['searchAppearance'],
      rowLimit: 20
    },
    recent_performance: {
      dimensions: ['date'],
      rowLimit: days
    },
    query_position_distribution: {
      dimensions: ['query'],
      rowLimit: 100
    },
    page_ctr_analysis: {
      dimensions: ['page'],
      rowLimit: 50
    },
    mobile_vs_desktop: {
      dimensions: ['device', 'date'],
      rowLimit: 100
    },
    trending_queries: {
      dimensions: ['query', 'date'],
      rowLimit: 200
    }
  };

  const reportConfig = reports[reportType];

  return executeWithErrorHandling(async () => {
    const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: startDate,
        endDate: endDate,
        dimensions: reportConfig.dimensions,
        rowLimit: reportConfig.rowLimit
      }
    });

    // Add report metadata
    const result = {
      reportType: reportType,
      period: {
        startDate: startDate,
        endDate: endDate,
        days: days
      },
      summary: {
        totalClicks: response.data.rows?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0,
        totalImpressions: response.data.rows?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0,
        avgCtr: response.data.rows?.length > 0 
          ? response.data.rows.reduce((sum, row) => sum + (row.ctr || 0), 0) / response.data.rows.length 
          : 0,
        avgPosition: response.data.rows?.length > 0
          ? response.data.rows.reduce((sum, row) => sum + (row.position || 0), 0) / response.data.rows.length
          : 0,
        rowCount: response.data.rows?.length || 0
      },
      data: response.data
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }, siteUrl);
});

// Tool 6: Index Coverage - Get index coverage issues
server.registerTool('index_coverage', {
  title: 'Index Coverage',
  description: 'Get index coverage data and issues for your property',
  inputSchema: {
    siteUrl: z.string().describe('The site URL (e.g., https://example.com)'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    dimensions: z.array(z.enum(['coverageState', 'indexingState', 'pageFetchState', 'verdict', 'robotsTxtState']))
      .optional()
      .describe('Dimensions to group by')
  }
}, async ({ siteUrl, startDate, endDate, dimensions }) => {
  if (!siteUrl) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Site URL is required',
          example: 'siteUrl: "https://example.com"'
        }, null, 2)
      }]
    };
  }

  return executeWithErrorHandling(async () => {
    const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: startDate,
        endDate: endDate,
        dimensions: dimensions || ['coverageState'],
        type: 'web',
        dataState: 'all'
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response.data, null, 2)
      }]
    };
  }, siteUrl);
});

// Register list of tools
server.registerTool('list_tools', {
  title: 'List Available Tools',
  description: 'Get a list of all available Search Console tools and their descriptions',
  inputSchema: {}
}, async () => {
  const tools = [
    {
      name: 'search_analytics',
      description: 'Query search performance data including impressions, clicks, CTR, and position',
      example: {
        siteUrl: 'https://example.com',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dimensions: ['query', 'page']
      }
    },
    {
      name: 'list_sites',
      description: 'List all Search Console properties the service account has access to',
      example: {}
    },
    {
      name: 'url_inspection',
      description: 'Inspect a specific URL to get indexing and crawling information',
      example: {
        siteUrl: 'https://example.com',
        inspectionUrl: 'https://example.com/page'
      }
    },
    {
      name: 'sitemaps',
      description: 'List all sitemaps or get information about a specific sitemap',
      example: {
        siteUrl: 'https://example.com',
        action: 'list'
      }
    },
    {
      name: 'quick_insights',
      description: 'Get pre-configured reports for common Search Console insights',
      reportTypes: [
        'top_queries',
        'top_pages',
        'countries',
        'devices',
        'search_appearance',
        'recent_performance',
        'query_position_distribution',
        'page_ctr_analysis',
        'mobile_vs_desktop',
        'trending_queries'
      ],
      example: {
        siteUrl: 'https://example.com',
        reportType: 'top_queries',
        days: 28
      }
    },
    {
      name: 'index_coverage',
      description: 'Get index coverage data and issues for your property',
      example: {
        siteUrl: 'https://example.com',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    }
  ];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        availableTools: tools,
        serviceAccount: serviceAccountEmail,
        instructions: 'Use these tools to interact with Google Search Console. Make sure the service account has access to your Search Console properties.'
      }, null, 2)
    }]
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Search Console MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});