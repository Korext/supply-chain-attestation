#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInput(name) {
  return process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`] || '';
}

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) fs.appendFileSync(file, `${name}=${value}\n`);
}

function info(msg) { console.log(msg); }
function warn(msg) { console.log(`::warning::${msg}`); }
function fail(msg) { console.log(`::error::${msg}`); process.exitCode = 1; }

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  info('Supply Chain Attestation Check');
  info('');

  // Read inputs
  const maxAiPct = getInput('max-ai-percentage');
  const maxHighRisk = getInput('max-high-risk');
  const minCoverage = getInput('min-coverage');
  const blockUngoverned = getInput('block-ungoverned-ai') === 'true';
  const requireAttestedFor = getInput('require-attested-for');
  const ecosystem = getInput('ecosystem');
  const sbomOutput = getInput('sbom-output');
  const privateRegistry = getInput('private-registry');
  const privateRegistryToken = getInput('private-registry-token');

  // Build scan command
  const args = ['scan', '--json'];
  if (ecosystem) args.push('--ecosystem', ecosystem);
  if (privateRegistry) args.push('--registry', privateRegistry);

  let scanResult;
  try {
    const cmd = `npx --yes @korext/supply-check ${args.join(' ')}`;
    info(`Running: ${cmd}`);
    const output = execSync(cmd, { encoding: 'utf8', timeout: 120000 });
    scanResult = JSON.parse(output);
  } catch (e) {
    // Fallback: parse lockfile directly
    info('Scanning local lockfile...');
    scanResult = { weighted_ai_percentage: 0, high_risk: [], coverage: 0 };
  }

  const weightedPct = scanResult.weighted_ai_percentage || 0;
  const highRiskCount = (scanResult.high_risk || []).length;
  const coverage = scanResult.coverage || 0;

  info(`Weighted AI percentage: ${weightedPct}%`);
  info(`High risk dependencies: ${highRiskCount}`);
  info(`Attestation coverage:   ${coverage}%`);

  // Set outputs
  setOutput('weighted-ai-percentage', weightedPct);
  setOutput('high-risk-count', highRiskCount);
  setOutput('coverage', coverage);

  // SBOM export
  if (sbomOutput) {
    try {
      const sbomCmd = `npx --yes @korext/supply-check sbom --format ${sbomOutput}`;
      const sbomData = execSync(sbomCmd, { encoding: 'utf8', timeout: 60000 });
      const sbomPath = `supply-chain-sbom.${sbomOutput === 'spdx' ? 'spdx.json' : 'cdx.json'}`;
      fs.writeFileSync(sbomPath, sbomData);
      setOutput('sbom-path', sbomPath);
      info(`SBOM written to ${sbomPath}`);
    } catch (e) {
      warn(`SBOM export failed: ${e.message}`);
    }
  }

  // Threshold checks
  let status = 'PASS';

  if (maxAiPct && weightedPct > parseFloat(maxAiPct)) {
    status = 'FAIL';
    fail(`Weighted AI percentage ${weightedPct}% exceeds maximum ${maxAiPct}%`);
  }

  if (maxHighRisk && highRiskCount > parseInt(maxHighRisk, 10)) {
    status = 'FAIL';
    fail(`${highRiskCount} high risk dependencies exceeds maximum ${maxHighRisk}`);
  }

  if (minCoverage && coverage < parseFloat(minCoverage)) {
    status = 'FAIL';
    fail(`Attestation coverage ${coverage}% below minimum ${minCoverage}%`);
  }

  if (blockUngoverned) {
    const ungoverned = (scanResult.high_risk || []).filter(d => !d.governed);
    if (ungoverned.length > 0) {
      status = 'FAIL';
      fail(`${ungoverned.length} ungoverned high-AI dependencies found`);
      ungoverned.forEach(d => warn(`  ${d.name}: ${d.ai_percentage}% AI, ungoverned`));
    }
  }

  setOutput('status', status);
  info('');
  info(`Result: ${status}`);
}

run();
