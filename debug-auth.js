#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

async function debugAuth() {
  console.log('🔍 Debugging Google Authentication\n');
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ Credentials loaded');
    console.log(`📧 Service account: ${credentials.client_email}`);
    console.log(`🆔 Project ID: ${credentials.project_id}\n`);

    // Test with different scope combinations
    const scopeTests = [
      {
        name: 'Search Console readonly',
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
      },
      {
        name: 'Search Console full',
        scopes: ['https://www.googleapis.com/auth/webmasters']
      },
      {
        name: 'Both scopes',
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/webmasters']
      }
    ];

    for (const test of scopeTests) {
      console.log(`🧪 Testing: ${test.name}`);
      
      try {
        const auth = new GoogleAuth({
          credentials: credentials,
          scopes: test.scopes
        });

        // Try to get access token
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        if (token.token) {
          console.log(`✅ ${test.name}: Token obtained successfully`);
          console.log(`   Token starts with: ${token.token.substring(0, 20)}...`);
        } else {
          console.log(`❌ ${test.name}: No token received`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
      console.log('');
    }

    // Test direct API call
    console.log('🔌 Testing direct Search Console API call...');
    
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
    });

    const authClient = await auth.getClient();
    
    // Make direct HTTP request to Search Console API
    const response = await authClient.request({
      url: 'https://searchconsole.googleapis.com/webmasters/v3/sites',
    });
    
    console.log('✅ Direct API call successful!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    
    if (error.message.includes('API has not been used')) {
      console.log('\n💡 Possible fix:');
      console.log('1. Go to https://console.cloud.google.com');
      console.log('2. Select your project');
      console.log('3. Go to APIs & Services > Library');
      console.log('4. Search for "Google Search Console API"');
      console.log('5. Make sure it\'s enabled');
    }
  }
}

debugAuth().catch(console.error);