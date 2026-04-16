const fs = require('fs');
const yaml = require('js-yaml');

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-ai-percentage' && args[i + 1]) { opts.maxAiPercentage = parseFloat(args[i + 1]); i++; }
    else if (args[i] === '--max-high-risk' && args[i + 1]) { opts.maxHighRisk = parseInt(args[i + 1]); i++; }
    else if (args[i] === '--min-coverage' && args[i + 1]) { opts.minCoverage = parseFloat(args[i + 1]); i++; }
    else if (args[i] === '--block-ungoverned-ai') { opts.blockUngovernedAi = true; }
    else if (args[i] === '--require-attested-for' && args[i + 1]) { opts.requireAttestedFor = args[i + 1]; i++; }
    else if (args[i] === '--help') { opts.help = true; }
  }
  return opts;
}

function matchGlob(pattern, name) {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(name);
}

module.exports = async function check(args) {
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(`Usage: supply-check check [options]

Policy enforcement for CI pipelines. Exit codes: 0=pass, 1=fail, 2=error.

Options:
  --max-ai-percentage <N>       Maximum weighted AI percentage
  --max-high-risk <N>           Maximum high risk dependencies
  --min-coverage <N>            Minimum attestation coverage percentage
  --block-ungoverned-ai         Fail if any HIGH/FULL AI dep lacks governance
  --require-attested-for <glob> Deps matching this glob must have ATTESTED tier
  --help                        Show this help
`);
    return;
  }

  const reportFile = '.supply-chain-attestation.yaml';
  if (!fs.existsSync(reportFile)) {
    console.error('No report found. Run "supply-check scan" first.');
    process.exit(2);
  }

  const data = yaml.load(fs.readFileSync(reportFile, 'utf8'));
  let failures = [];

  if (opts.maxAiPercentage !== undefined) {
    const pct = data.ai_composition ? data.ai_composition.weighted_percentage : 0;
    if (pct > opts.maxAiPercentage) {
      failures.push(`Weighted AI percentage ${pct}% exceeds maximum ${opts.maxAiPercentage}%`);
    }
  }

  if (opts.maxHighRisk !== undefined) {
    const count = data.high_risk_dependencies ? data.high_risk_dependencies.length : 0;
    if (count > opts.maxHighRisk) {
      failures.push(`${count} high risk dependencies exceed maximum ${opts.maxHighRisk}`);
    }
  }

  if (opts.minCoverage !== undefined) {
    const coverage = data.dependencies ? data.dependencies.coverage_percentage : 0;
    if (coverage < opts.minCoverage) {
      failures.push(`Attestation coverage ${coverage}% below minimum ${opts.minCoverage}%`);
    }
  }

  if (opts.blockUngovernedAi) {
    const deps = data.dependencies_detail || [];
    const ungoverned = deps.filter(d => d.ai_percentage > 60 &&
      (d.governance_tier === 'UNGOVERNED' || d.governance_tier === 'NO_ATTESTATION'));
    if (ungoverned.length > 0) {
      failures.push(`${ungoverned.length} high AI dependencies lack governance: ${ungoverned.map(d => d.name).join(', ')}`);
    }
  }

  if (opts.requireAttestedFor) {
    const deps = data.dependencies_detail || [];
    const violating = deps.filter(d => matchGlob(opts.requireAttestedFor, d.name) && d.governance_tier !== 'ATTESTED');
    if (violating.length > 0) {
      failures.push(`${violating.length} dependencies matching "${opts.requireAttestedFor}" are not ATTESTED: ${violating.map(d => d.name).join(', ')}`);
    }
  }

  if (failures.length === 0) {
    console.log('\n  Supply Chain Attestation: PASS\n');
    process.exit(0);
  } else {
    console.log('\n  Supply Chain Attestation: FAIL\n');
    for (const f of failures) {
      console.log(`  FAILURE: ${f}`);
    }
    console.log('');
    process.exit(1);
  }
};
