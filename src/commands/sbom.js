const fs = require('fs');
const yaml = require('js-yaml');

function parseArgs(args) {
  const opts = { format: 'cyclonedx' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) { opts.format = args[i + 1]; i++; }
    else if (args[i] === '--help') { opts.help = true; }
  }
  return opts;
}

module.exports = async function sbom(args) {
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(`Usage: supply-check sbom [options]

Export attestation data as CycloneDX 1.6 or SPDX 2.3 with AI properties embedded.

Options:
  --format <type>  SBOM format (cyclonedx|spdx). Default: cyclonedx
  --help           Show this help

Examples:
  supply-check sbom --format cyclonedx > sbom.json
  supply-check sbom --format spdx > sbom.spdx.json
`);
    return;
  }

  const reportFile = '.supply-chain-attestation.yaml';
  if (!fs.existsSync(reportFile)) {
    console.error('No report found. Run "supply-check scan" first.');
    process.exit(1);
  }

  const data = yaml.load(fs.readFileSync(reportFile, 'utf8'));
  const deps = data.dependencies_detail || [];

  if (opts.format === 'spdx') {
    const spdx = {
      spdxVersion: 'SPDX-2.3',
      dataLicense: 'CC0-1.0',
      SPDXID: 'SPDXRef-DOCUMENT',
      name: data.project ? data.project.name : 'unknown',
      documentNamespace: `https://oss.korext.com/supply-chain/spdx/${data.project ? data.project.name : 'unknown'}`,
      creationInfo: {
        created: data.generated || new Date().toISOString(),
        creators: ['Tool: korext-supply-check-1.0.0']
      },
      packages: deps.map((d, i) => ({
        SPDXID: `SPDXRef-Package-${i}`,
        name: d.name,
        versionInfo: d.version || '',
        downloadLocation: 'NOASSERTION',
        filesAnalyzed: false,
        annotations: [
          {
            annotationType: 'OTHER',
            annotator: 'Tool: korext-supply-check',
            annotationDate: data.generated || new Date().toISOString(),
            annotationComment: `korext:ai_percentage=${d.ai_percentage}; korext:governance_tier=${d.governance_tier}; korext:attestation_source=${d.attestation_source}`
          }
        ]
      }))
    };
    console.log(JSON.stringify(spdx, null, 2));
  } else {
    // CycloneDX 1.6
    const cdx = {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      version: 1,
      metadata: {
        timestamp: data.generated || new Date().toISOString(),
        tools: [{ vendor: 'Korext', name: 'supply-check', version: '1.0.0' }],
        component: data.project ? { name: data.project.name, type: 'application' } : undefined
      },
      components: deps.map(d => ({
        type: 'library',
        name: d.name,
        version: d.version || '',
        properties: [
          { name: 'korext:ai_percentage', value: String(d.ai_percentage) },
          { name: 'korext:governance_tier', value: d.governance_tier },
          { name: 'korext:attestation_source', value: d.attestation_source },
          { name: 'korext:attestation_url', value: `https://oss.korext.com/registry/${d.ecosystem}/${encodeURIComponent(d.name)}` }
        ]
      }))
    };
    console.log(JSON.stringify(cdx, null, 2));
  }
};
