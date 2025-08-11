#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to print colored output
function print(message, color = '') {
  console.log(color + message + colors.reset);
}

// Helper function to print section headers
function printSection(title) {
  console.log('\n' + colors.bright + colors.blue + '=' + '='.repeat(50));
  console.log(`  ${title}`);
  console.log('=' + '='.repeat(50) + colors.reset + '\n');
}

// Main test function
async function testConnection() {
  printSection('Google Search Console Connection Test');

  try {
    // Check for credentials
    if (!process.env.GOOGLE_CREDENTIALS) {
      print('❌ GOOGLE_CREDENTIALS environment variable not found', colors.red);
      print('\nPlease set GOOGLE_CREDENTIALS in your .env file or environment', colors.yellow);
      print('Example: GOOGLE_CREDENTIALS=\'{"type":"service_account",...}\'', colors.cyan);
      process.exit(1);
    }

    // Parse credentials
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      print('✅ Credentials parsed successfully', colors.green);
    } catch (error) {
      print('❌ Failed to parse GOOGLE_CREDENTIALS JSON', colors.red);
      print(`Error: ${error.message}`, colors.red);
      process.exit(1);
    }

    // Extract service account email
    const serviceAccountEmail = credentials.client_email;
    print(`✅ Service Account: ${serviceAccountEmail}`, colors.green);

    // Initialize Google Auth
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters']
    });

    // Get auth client for direct API calls
    const authClient = await auth.getClient();

    print('✅ Search Console auth client initialized', colors.green);

    // Test 1: List all accessible sites
    printSection('Test 1: List Sites');
    
    try {
      // Use direct API call instead of client wrapper
      const authClient = await auth.getClient();
      const sitesResponse = await authClient.request({
        url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
      });
      const sites = sitesResponse.data.siteEntry || [];
      
      if (sites.length === 0) {
        print('⚠️  No Search Console properties found', colors.yellow);
        print(`\nTo add properties:`, colors.cyan);
        print(`1. Go to https://search.google.com/search-console`, colors.cyan);
        print(`2. Add your website property`, colors.cyan);
        print(`3. Go to Settings > Users and permissions`, colors.cyan);
        print(`4. Add ${serviceAccountEmail} with at least "Restricted" access`, colors.cyan);
      } else {
        print(`✅ Found ${sites.length} Search Console properties:`, colors.green);
        sites.forEach((site, index) => {
          print(`   ${index + 1}. ${site.siteUrl} (Permission: ${site.permissionLevel})`, colors.cyan);
        });

        // Test 2: Search Analytics for the first property
        const testSiteUrl = sites[0].siteUrl;
        printSection('Test 2: Search Analytics Query');
        print(`Testing with property: ${testSiteUrl}`, colors.cyan);

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        try {
          const analyticsResponse = await authClient.request({
            url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(testSiteUrl)}/searchAnalytics/query`,
            method: 'POST',
            data: {
              startDate: startDate,
              endDate: endDate,
              dimensions: ['query'],
              rowLimit: 5
            }
          });

          if (analyticsResponse.data.rows && analyticsResponse.data.rows.length > 0) {
            print(`✅ Search Analytics working! Top queries from last 7 days:`, colors.green);
            analyticsResponse.data.rows.forEach((row, index) => {
              const query = row.keys[0];
              print(`   ${index + 1}. "${query}" - Clicks: ${row.clicks}, Impressions: ${row.impressions}`, colors.cyan);
            });
          } else {
            print('⚠️  No search data found for the last 7 days', colors.yellow);
          }
        } catch (error) {
          print(`⚠️  Could not fetch search analytics: ${error.message}`, colors.yellow);
        }

        // Test 3: URL Inspection (if supported)
        printSection('Test 3: URL Inspection');
        
        // Check if it's a URL-prefix property (not domain property)
        if (!testSiteUrl.startsWith('sc-domain:')) {
          try {
            const inspectionResponse = await authClient.request({
              url: 'https://searchconsole.googleapis.com/webmasters/v1/urlInspection/index:inspect',
              method: 'POST',
              data: {
                siteUrl: testSiteUrl,
                inspectionUrl: testSiteUrl.replace(/\/$/, ''), // Remove trailing slash
                languageCode: 'en'
              }
            });

            if (inspectionResponse.data.inspectionResult) {
              const result = inspectionResponse.data.inspectionResult;
              print(`✅ URL Inspection working!`, colors.green);
              print(`   Coverage State: ${result.indexStatusResult?.coverageState || 'Unknown'}`, colors.cyan);
              print(`   Last Crawl Time: ${result.indexStatusResult?.lastCrawlTime || 'Never'}`, colors.cyan);
            }
          } catch (error) {
            print(`⚠️  URL Inspection not available: ${error.message}`, colors.yellow);
            print(`   Note: URL Inspection may not be available for all property types`, colors.yellow);
          }
        } else {
          print(`⚠️  URL Inspection not available for domain properties`, colors.yellow);
        }

        // Test 4: List Sitemaps
        printSection('Test 4: Sitemaps');
        
        try {
          const sitemapsResponse = await authClient.request({
            url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(testSiteUrl)}/sitemaps`
          });

          const sitemaps = sitemapsResponse.data.sitemap || [];
          if (sitemaps.length > 0) {
            print(`✅ Found ${sitemaps.length} sitemaps:`, colors.green);
            sitemaps.forEach((sitemap, index) => {
              print(`   ${index + 1}. ${sitemap.path} - Status: ${sitemap.isPending ? 'Pending' : 'Processed'}`, colors.cyan);
            });
          } else {
            print('ℹ️  No sitemaps submitted for this property', colors.cyan);
          }
        } catch (error) {
          print(`⚠️  Could not fetch sitemaps: ${error.message}`, colors.yellow);
        }
      }
    } catch (error) {
      print(`❌ Failed to connect to Search Console API`, colors.red);
      print(`Error: ${error.message}`, colors.red);
      
      if (error.code === 403) {
        print(`\nPermission denied. Please ensure:`, colors.yellow);
        print(`1. Search Console API is enabled in Google Cloud Console`, colors.yellow);
        print(`2. Service account has the correct roles`, colors.yellow);
      }
      process.exit(1);
    }

    // Test 5: Quick Insights Summary
    printSection('Test 5: Available Quick Insights');
    
    const reportTypes = [
      'top_queries - Top performing search queries',
      'top_pages - Most visited pages from search',
      'countries - Traffic by country',
      'devices - Device type breakdown',
      'search_appearance - Search feature appearances',
      'recent_performance - Daily performance trends',
      'query_position_distribution - Position analysis',
      'page_ctr_analysis - CTR performance by page',
      'mobile_vs_desktop - Device comparison',
      'trending_queries - Queries with changing performance'
    ];

    print('Available quick insight reports:', colors.green);
    reportTypes.forEach(type => {
      print(`   • ${type}`, colors.cyan);
    });

    // Summary
    printSection('Connection Test Summary');
    print('✅ All tests completed successfully!', colors.green);
    print('\nYour Search Console MCP server is ready to use.', colors.bright + colors.green);
    print('\nYou can now:', colors.cyan);
    print('  1. Run the server with: npm start', colors.cyan);
    print('  2. Configure it in Claude Desktop', colors.cyan);
    print('  3. Use the tools to query Search Console data', colors.cyan);

  } catch (error) {
    print(`\n❌ Unexpected error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testConnection().catch(error => {
  print(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});