const fs = require('fs');
const yaml = require('js-yaml');

function parseArgs(args) {
  const opts = { format: 'text', filter: null, sort: 'name', top: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) { opts.format = args[i + 1]; i++; }
    else if (args[i] === '--filter' && args[i + 1]) { opts.filter = args[i + 1]; i++; }
    else if (args[i] === '--sort' && args[i + 1]) { opts.sort = args[i + 1]; i++; }
    else if (args[i] === '--top' && args[i + 1]) { opts.top = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--help') { opts.help = true; }
  }
  return opts;
}

module.exports = async function report(args) {
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(`Usage: supply-check report [options]

Options:
  --format <type>    Output format (text|json|table|sbom-cyclonedx|sbom-spdx). Default: text
  --filter <rule>    Filter dependencies (high-risk|ungoverned|attested)
  --sort <field>     Sort by (name|ai-percentage|tier). Default: name
  --top <N>          Show top N dependencies only
  --help             Show this help
`);
    return;
  }

  const reportFile = '.supply-chain-attestation.yaml';
  if (!fs.existsSync(reportFile)) {
    console.error('No report found. Run "supply-check scan" first.');
    process.exit(1);
  }

  const data = yaml.load(fs.readFileSync(reportFile, 'utf8'));
  let deps = data.dependencies_detail || [];

  // Apply filter
  if (opts.filter === 'high-risk') {
    deps = deps.filter(d => d.ai_percentage > 60 && d.governance_tier !== 'ATTESTED');
  } else if (opts.filter === 'ungoverned') {
    deps = deps.filter(d => d.governance_tier === 'UNGOVERNED' || d.governance_tier === 'NO_ATTESTATION');
  } else if (opts.filter === 'attested') {
    deps = deps.filter(d => d.governance_tier === 'ATTESTED');
  }

  // Apply sort
  if (opts.sort === 'ai-percentage') {
    deps.sort((a, b) => b.ai_percentage - a.ai_percentage);
  } else if (opts.sort === 'tier') {
    deps.sort((a, b) => a.governance_tier.localeCompare(b.governance_tier));
  } else {
    deps.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Apply top
  if (opts.top) deps = deps.slice(0, opts.top);

  if (opts.format === 'json') {
    console.log(JSON.stringify({ ...data, dependencies_detail: deps }, null, 2));
  } else if (opts.format === 'table') {
    console.log('Name'.padEnd(40) + 'Version'.padEnd(15) + 'AI %'.padEnd(8) + 'Tier');
    console.log('-'.repeat(80));
    for (const d of deps) {
      console.log(d.name.padEnd(40) + (d.version || '').padEnd(15) + String(d.ai_percentage).padEnd(8) + d.governance_tier);
    }
  } else {
    console.log(yaml.dump({ ...data, dependencies_detail: deps }));
  }
};
