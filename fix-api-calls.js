#!/usr/bin/env node
import fs from 'fs';

const filePath = 'src/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the googleapis import and searchConsoleClient
content = content.replace("import { searchconsole } from '@googleapis/searchconsole';\n", '');

// Fix remaining searchanalytics.query calls
content = content.replace(
  /const response = await searchConsoleClient\.searchanalytics\.query\(\{\s*siteUrl: siteUrl,\s*requestBody: \{([^}]+)\}\s*\}\);/gs,
  `const response = await authClient.request({
      url: \`https://searchconsole.googleapis.com/webmasters/v3/sites/\${encodeURIComponent(siteUrl)}/searchAnalytics/query\`,
      method: 'POST',
      data: {$1}
    });`
);

// Fix urlInspection calls
content = content.replace(
  /const response = await searchConsoleClient\.urlInspection\.index\.inspect\(\{([^}]+)\}\);/g,
  `const response = await authClient.request({
      url: 'https://searchconsole.googleapis.com/webmasters/v1/urlInspection/index:inspect',
      method: 'POST',
      data: {$1}
    });`
);

// Fix sitemaps calls
content = content.replace(
  /const response = await searchConsoleClient\.sitemaps\.get\(\{([^}]+)\}\);/g,
  `const response = await authClient.request({
      url: \`https://searchconsole.googleapis.com/webmasters/v3/sites/\${encodeURIComponent(siteUrl)}/sitemaps/\${encodeURIComponent(sitemapPath)}\`
    });`
);

content = content.replace(
  /const response = await searchConsoleClient\.sitemaps\.list\(\{([^}]+)\}\);/g,
  `const response = await authClient.request({
      url: \`https://searchconsole.googleapis.com/webmasters/v3/sites/\${encodeURIComponent(siteUrl)}/sitemaps\`
    });`
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed all API calls in src/index.js');
console.log('🔧 Converted from googleapis client to direct HTTP calls');