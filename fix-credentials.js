#!/usr/bin/env node

console.log('Credentials Fix Helper');
console.log('====================\n');

console.log('1. Put your JSON credentials file in this directory');
console.log('2. Run: node fix-credentials.js your-credentials-file.json');
console.log('3. This will create a properly formatted .env file\n');

import fs from 'fs';
import path from 'path';

const credentialsFile = process.argv[2];

if (!credentialsFile) {
  console.log('Usage: node fix-credentials.js your-credentials-file.json');
  process.exit(1);
}

try {
  const fullPath = path.resolve(credentialsFile);
  const credentials = fs.readFileSync(fullPath, 'utf8');
  
  // Validate it's valid JSON
  const parsed = JSON.parse(credentials);
  
  console.log('✅ Credentials file is valid JSON');
  console.log(`✅ Service account email: ${parsed.client_email}`);
  
  // Create .env file with properly formatted credentials
  const envContent = `GOOGLE_CREDENTIALS='${credentials.replace(/\n/g, '').replace(/\r/g, '')}'`;
  
  fs.writeFileSync('.env', envContent);
  
  console.log('✅ Created .env file with properly formatted credentials');
  console.log('\nNow run: npm test');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure:');
  console.log('1. The file path is correct');
  console.log('2. The file contains valid JSON');
  console.log('3. You have permission to read the file');
}