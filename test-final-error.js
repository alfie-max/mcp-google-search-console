#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function testFinalErrorHandling() {
  console.log('🧪 Testing Final Enhanced Error Handling\n');
  
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const serviceAccountEmail = credentials.client_email;
  
  const auth = new GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
  });
  
  const authClient = await auth.getClient();

  // Test with unauthorized site
  const testSite = 'https://example.com';
  console.log(`🔍 Testing with: ${testSite}`);
  
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
    
    console.log('❌ Unexpected: Request succeeded');
    
  } catch (error) {
    console.log(`✅ Expected error: ${error.code} - ${error.message}\n`);
    
    // Simulate our enhanced error handling
    const enhancedErrorResponse = {
      error: 'Permission denied for this Search Console property',
      siteUrl: testSite,
      serviceAccountEmail: serviceAccountEmail,
      solution: 'The service account needs access to this Search Console property',
      possibleCauses: [
        'The property exists but the service account has no access',
        'The property has not been added to Search Console yet', 
        'The property URL format is incorrect'
      ],
      instructions: 'Follow these steps to resolve:',
      steps: [
        'OPTION A: If the property already exists in Search Console:',
        '1. Go to Google Search Console (https://search.google.com/search-console)',
        `2. Select the property: ${testSite}`,
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
        `3. Enter your website URL: ${testSite}`,
        '4. Choose property type (URL-prefix or Domain)',
        '5. Click "Continue" and verify ownership',
        '6. After verification, follow Option A steps above',
        '',
        'Then wait 5-10 minutes for permissions to propagate and try again'
      ],
      originalError: error.message
    };
    
    console.log('📋 Enhanced MCP Server Response:');
    console.log(JSON.stringify(enhancedErrorResponse, null, 2));
  }
}

testFinalErrorHandling().catch(console.error);