const https = require('https');
const http = require('http');

module.exports = async function registry(args) {
  if (args.length === 0 || args[0] === '--help') {
    console.log(`Usage: supply-check registry <ecosystem>:<package>

Examples:
  supply-check registry npm:lodash
  supply-check registry pypi:requests
  supply-check registry cargo:serde
  supply-check registry go:github.com/gin-gonic/gin
  supply-check registry rubygems:rails
  supply-check registry maven:com.google.guava:guava
  supply-check registry nuget:Newtonsoft.Json
  supply-check registry composer:symfony/console
`);
    return;
  }

  const query = args[0];
  const colonIdx = query.indexOf(':');
  if (colonIdx === -1) {
    console.error('Format: <ecosystem>:<package>');
    process.exit(2);
  }

  const ecosystem = query.substring(0, colonIdx);
  const pkgName = query.substring(colonIdx + 1);
  const registryUrl = `https://oss.korext.com/api/registry/${ecosystem}/${encodeURIComponent(pkgName)}`;

  console.log(`\n  Querying registry for ${ecosystem}:${pkgName}...`);
  console.log(`  URL: ${registryUrl}\n`);

  try {
    const data = await fetchJson(registryUrl);
    console.log(`  Package: ${data.name || pkgName}`);
    console.log(`  Ecosystem: ${data.ecosystem || ecosystem}`);
    console.log(`  AI Percentage: ${data.ai_percentage !== undefined ? data.ai_percentage + '%' : 'N/A'}`);
    console.log(`  Governance Tier: ${data.governance_tier || 'N/A'}`);
    console.log(`  Attestation Source: ${data.attestation_source || 'N/A'}`);
    if (data.tools && data.tools.length > 0) {
      console.log(`  Tools: ${data.tools.join(', ')}`);
    }
    console.log('');
  } catch (err) {
    console.log(`  No attestation data found (${err.message})\n`);
  }
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 404) {
        reject(new Error('404 Not Found'));
        return;
      }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid response')); }
      });
    }).on('error', reject);
  });
}
