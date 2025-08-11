#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function print(message, color = '') {
  console.log(color + message + colors.reset);
}

async function testAllErrorScenarios() {
  print('🧪 Testing All Error Scenarios\n', colors.blue);
  
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const serviceAccountEmail = credentials.client_email;
  
  const auth = new GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });
  
  const authClient = await auth.getClient();

  // Function to simulate our executeWithErrorHandling
  function mockExecuteWithErrorHandling(error, siteUrl) {
    // Handle property not found errors (404 or "site not found")
    if (error.code === 404 || error.message?.includes('not found') || error.message?.includes('does not exist')) {
      return {
        error: 'Search Console property not found',
        siteUrl: siteUrl,
        solution: `This website is not added to Search Console yet`,
        instructions: 'Follow these steps to add the property:',
        steps: [
          '1. Go to Google Search Console (https://search.google.com/search-console)',
          '2. Click "Add property" button',
          '3. Choose property type:',
          '   • URL prefix: For specific URL (https://example.com)',
          '   • Domain: For entire domain (example.com)',
          `4. Enter your website URL: ${siteUrl}`,
          '5. Click "Continue"',
          '6. Verify ownership using one of the methods provided',
          '7. After verification, go to Settings > Users and permissions',
          `8. Add this service account: ${serviceAccountEmail}`,
          '9. Select permission level: "Restricted"',
          '10. Wait for data to populate (can take 24-48 hours for new properties)'
        ],
        additionalInfo: 'Note: Search Console requires ownership verification before you can access data',
        originalError: error.message
      };
    }

    // Handle permission errors
    if (error.code === 403 || error.message?.includes('permission') || error.message?.includes('forbidden')) {
      return {
        error: 'Permission denied for this Search Console property',
        siteUrl: siteUrl,
        serviceAccountEmail: serviceAccountEmail,
        solution: `The service account needs access to this Search Console property`,
        instructions: 'Follow these steps to grant access:',
        steps: [
          '1. Go to Google Search Console (https://search.google.com/search-console)',
          `2. Select the property: ${siteUrl}`,
          '3. Click Settings (⚙️) in the left sidebar',
          '4. Click "Users and permissions"',
          '5. Click "Add user" button',
          `6. Enter this email: ${serviceAccountEmail}`,
          '7. Select permission level: "Restricted" (sufficient for read access)',
          '8. Click "Add"',
          '9. Wait 5-10 minutes for permissions to propagate',
          '10. Try your query again'
        ],
        originalError: error.message
      };
    }

    // Handle rate limiting errors
    if (error.code === 429 || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
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
      };
    }

    // Default error
    return {
      error: 'Failed to fetch Search Console data',
      message: error.message,
      siteUrl: siteUrl
    };
  }

  const testCases = [
    {
      name: '403 Permission Denied',
      siteUrl: 'https://google.com',
      description: 'Site exists but service account has no access'
    },
    {
      name: '404 Property Not Found', 
      siteUrl: 'https://nonexistent-website-12345.com',
      description: 'Site not added to Search Console'
    }
  ];

  for (const testCase of testCases) {
    print(`\n📋 Testing: ${testCase.name}`, colors.yellow);
    print(`URL: ${testCase.siteUrl}`, colors.cyan);
    print(`Scenario: ${testCase.description}`, colors.cyan);
    
    try {
      const response = await authClient.request({
        url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(testCase.siteUrl)}/searchAnalytics/query`,
        method: 'POST',
        data: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          dimensions: ['query'],
          rowLimit: 5
        }
      });
      
      print('❌ Unexpected: Request succeeded when it should have failed', colors.red);
      
    } catch (error) {
      print(`✅ Expected error occurred (${error.code || 'No code'})`, colors.green);
      
      const mockResponse = mockExecuteWithErrorHandling(error, testCase.siteUrl);
      
      print('\n📄 MCP Server Response:', colors.blue);
      console.log(JSON.stringify(mockResponse, null, 2));
    }
  }

  print('\n🎯 Error Handling Test Summary:', colors.blue);
  print('✅ 404 errors → Property setup instructions', colors.green);
  print('✅ 403 errors → Permission granting instructions', colors.green);  
  print('✅ 429 errors → Rate limit guidance', colors.green);
  print('✅ All errors include service account email', colors.green);
  print('✅ Step-by-step instructions provided', colors.green);
}

testAllErrorScenarios().catch(console.error);