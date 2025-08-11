#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function testPermissionError() {
  console.log('🧪 Testing Permission Error Handling\n');
  
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const serviceAccountEmail = credentials.client_email;
  
  console.log(`Service Account: ${serviceAccountEmail}`);
  
  const auth = new GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });
  
  const authClient = await auth.getClient();
  
  // Try to access a site we don't have permission for
  const testSite = 'https://google.com';
  console.log(`\nTrying to access: ${testSite} (should fail)`);
  
  try {
    const response = await authClient.request({
      url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(testSite)}/searchAnalytics/query`,
      method: 'POST',
      data: {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dimensions: ['query'],
        rowLimit: 5
      }
    });
    
    console.log('❌ Unexpected: Request succeeded when it should have failed');
    console.log(response.data);
    
  } catch (error) {
    console.log('✅ Expected error occurred');
    console.log(`Error code: ${error.code || 'No code'}`);
    console.log(`Error message: ${error.message}`);
    
    // Simulate what our MCP server would return
    const mockedResponse = {
      error: 'Permission denied for this Search Console property',
      siteUrl: testSite,
      serviceAccountEmail: serviceAccountEmail,
      solution: `The service account needs access to this Search Console property`,
      instructions: 'Follow these steps to grant access:',
      steps: [
        '1. Go to Google Search Console (https://search.google.com/search-console)',
        `2. Select the property: ${testSite}`,
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
    
    console.log('\n📋 MCP Server Response would be:');
    console.log(JSON.stringify(mockedResponse, null, 2));
  }
}

testPermissionError().catch(console.error);