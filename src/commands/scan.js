const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ecosystems = require('../ecosystems');

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ecosystem' && args[i + 1]) { opts.ecosystem = args[i + 1]; i++; }
    else if (args[i] === '--weighting' && args[i + 1]) { opts.weighting = args[i + 1]; i++; }
    else if (args[i] === '--registry' && args[i + 1]) { opts.registry = args[i + 1]; i++; }
    else if (args[i] === '--private-registry' && args[i + 1]) { opts.privateRegistry = args[i + 1]; i++; }
    else if (args[i] === '--output' && args[i + 1]) { opts.output = args[i + 1]; i++; }
    else if (args[i] === '--help') { opts.help = true; }
  }
  return opts;
}

module.exports = async function scan(args) {
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(`Usage: supply-check scan [options]

Options:
  --ecosystem <name>      Force ecosystem (npm|pypi|cargo|go|rubygems|maven|nuget|composer)
  --weighting <strategy>  Weighting strategy (uniform|size|imports|loc). Default: size
  --registry <url>        Public registry URL
  --private-registry <url> Private registry URL
  --output <file>         Write report to file
  --help                  Show this help
`);
    return;
  }

  const projectPath = process.cwd();
  console.log('\n  Supply Chain Attestation\n');

  // Detect ecosystem(s)
  let adapters = [];
  if (opts.ecosystem) {
    const adapter = ecosystems[opts.ecosystem];
    if (!adapter) {
      console.error(`  Unknown ecosystem: ${opts.ecosystem}`);
      process.exit(2);
    }
    adapters = [{ name: opts.ecosystem, adapter }];
  } else {
    for (const [name, adapter] of Object.entries(ecosystems)) {
      if (typeof adapter.detect === 'function' && adapter.detect(projectPath)) {
        adapters.push({ name, adapter });
      }
    }
  }

  if (adapters.length === 0) {
    console.log('  No supported ecosystem detected in current directory.');
    console.log('  Supported: npm, pypi, cargo, go, rubygems, maven, nuget, composer\n');
    return;
  }

  for (const { name, adapter } of adapters) {
    console.log(`  Ecosystem: ${name}`);

    const deps = adapter.enumerateDependencies(projectPath);
    const total = deps.length;

    // Query registry for attestation data (simulated for v1.0)
    let withAttestation = 0;
    let withoutAttestation = 0;
    let totalAiPercentage = 0;
    let totalSize = 0;
    const tiers = { attested: 0, scanned: 0, ungoverned: 0, no_attestation: 0 };
    const toolCounts = {};
    const highRisk = [];

    for (const dep of deps) {
      // Check for attestation (package bundled, registry, or repository)
      const attestation = adapter.fetchPackageAttestation(dep);

      if (attestation) {
        withAttestation++;
        const aiPct = attestation.ai ? attestation.ai.percentage : 0;
        const size = 1; // uniform weighting for now
        totalAiPercentage += aiPct * size;
        totalSize += size;

        if (attestation.governance && attestation.governance.engine) {
          if (attestation.governance.proof_bundle_url) tiers.attested++;
          else tiers.scanned++;
        } else {
          tiers.ungoverned++;
        }

        if (attestation.ai && attestation.ai.tools) {
          for (const tool of attestation.ai.tools) {
            toolCounts[tool.name] = (toolCounts[tool.name] || 0) + 1;
          }
        }

        if (aiPct > 60 && !attestation.governance) {
          highRisk.push({ name: dep.name, version: dep.version, ai_percentage: aiPct, governance_tier: 'UNGOVERNED' });
        }
      } else {
        withoutAttestation++;
        tiers.no_attestation++;
      }
    }

    const coverage = total > 0 ? ((withAttestation / total) * 100).toFixed(1) : '0.0';
    const weightedPct = totalSize > 0 ? (totalAiPercentage / totalSize).toFixed(1) : '0.0';

    console.log(`  Dependencies: ${total} total, ${total} scanned\n`);
    console.log(`  AI Coverage: ${withAttestation} dependencies (${coverage}%)\n`);
    console.log(`  Weighted AI Percentage: ${weightedPct}%\n`);
    console.log(`  Governance Distribution:`);
    console.log(`    ATTESTED: ${tiers.attested} dependencies`);
    console.log(`    SCANNED: ${tiers.scanned} dependencies`);
    console.log(`    UNGOVERNED: ${tiers.ungoverned} dependencies`);
    console.log(`    NO_ATTESTATION: ${tiers.no_attestation} dependencies\n`);

    if (Object.keys(toolCounts).length > 0) {
      console.log(`  Top AI Tools:`);
      for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${tool}  ${count} deps`);
      }
      console.log('');
    }

    if (highRisk.length > 0) {
      console.log(`  High Risk Dependencies: ${highRisk.length}`);
      for (const hr of highRisk) {
        console.log(`    ${hr.name}@${hr.version}: ${hr.ai_percentage}% AI, ${hr.governance_tier.toLowerCase()}`);
      }
      console.log('');
    }

    // Build report object
    const report = {
      schema: 'https://oss.korext.com/supply-chain/schema',
      version: '1.0',
      project: {
        name: path.basename(projectPath),
        path: projectPath,
        manifest: adapter.detect(projectPath) ? 'detected' : 'none',
        ecosystem: name
      },
      generated: new Date().toISOString(),
      dependencies: {
        total,
        scanned: total,
        with_attestation: withAttestation,
        without_attestation: withoutAttestation,
        coverage_percentage: parseFloat(coverage)
      },
      ai_composition: {
        weighted_percentage: parseFloat(weightedPct),
        aggregate_assisted_commits: 0,
        aggregate_total_commits: 0
      },
      governance_tiers: tiers,
      tools_detected: Object.entries(toolCounts).map(([name, count]) => ({ name, dependency_count: count })),
      high_risk_dependencies: highRisk,
      dependencies_detail: deps.map(d => ({
        name: d.name,
        version: d.version,
        ecosystem: name,
        attestation_source: 'none',
        ai_percentage: 0.0,
        governance_tier: 'NO_ATTESTATION'
      }))
    };

    const outputFile = opts.output || '.supply-chain-attestation.yaml';
    fs.writeFileSync(outputFile, yaml.dump(report, { lineWidth: -1 }));
    console.log(`  Report: ${outputFile}\n`);
  }
};
