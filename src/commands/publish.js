const fs = require('fs');
const yaml = require('js-yaml');
const ecosystems = require('../ecosystems');

module.exports = async function publish(args) {
  if (args[0] === '--help' || args.length === 0) {
    console.log(`Usage: supply-check publish [options]

Publishes your project's .ai-attestation.yaml to the public registry.
Auto-detects ecosystem from the project root.

Options:
  --registry <url>  Registry endpoint. Default: https://oss.korext.com/api/registry/publish
  --token <token>   Auth token (or set KOREXT_REGISTRY_TOKEN env)
  --help            Show this help
`);
    return;
  }

  const projectPath = process.cwd();
  const attestationPath = '.ai-attestation.yaml';

  if (!fs.existsSync(attestationPath)) {
    console.error('No .ai-attestation.yaml found. Run "npx @korext/ai-attestation init" first.');
    process.exit(1);
  }

  const attestation = yaml.load(fs.readFileSync(attestationPath, 'utf8'));

  // Detect ecosystem
  let ecosystem = null;
  for (const [name, adapter] of Object.entries(ecosystems)) {
    if (typeof adapter.detect === 'function' && adapter.detect(projectPath)) {
      ecosystem = name;
      break;
    }
  }

  if (!ecosystem) {
    console.error('Could not detect ecosystem. Use --ecosystem flag.');
    process.exit(2);
  }

  // Determine package name
  let pkgName = attestation.repo ? `${attestation.repo.owner}/${attestation.repo.name}` : 'unknown';
  if (ecosystem === 'npm' && fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkgName = pkg.name;
  }

  let registryUrl = 'https://oss.korext.com/api/registry/publish';
  let token = process.env.KOREXT_REGISTRY_TOKEN || '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--registry' && args[i + 1]) { registryUrl = args[i + 1]; i++; }
    if (args[i] === '--token' && args[i + 1]) { token = args[i + 1]; i++; }
  }

  console.log(`\n  Publishing attestation for ${ecosystem}:${pkgName}`);
  console.log(`  Registry: ${registryUrl}`);

  const payload = JSON.stringify({
    ecosystem,
    name: pkgName,
    attestation
  });

  try {
    const url = new URL(registryUrl);
    const client = url.protocol === 'https:' ? require('https') : require('http');
    const req = client.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('  Published successfully.\n');
        } else {
          console.error(`  Publish failed: ${res.statusCode} ${body}\n`);
          process.exit(1);
        }
      });
    });
    req.on('error', (err) => {
      console.error(`  Connection error: ${err.message}\n`);
      process.exit(1);
    });
    req.write(payload);
    req.end();
  } catch (err) {
    console.error(`  Publish error: ${err.message}\n`);
    process.exit(1);
  }
};
