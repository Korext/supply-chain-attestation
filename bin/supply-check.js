#!/usr/bin/env node

/**
 * Supply Chain Attestation CLI
 * Copyright Korext
 * License: Apache-2.0
 */

const fs = require('fs');
const path = require('path');

const VERSION = "1.0.0";

function printHelp() {
  console.log(`Supply Chain Attestation v${VERSION}

Usage: npx @korext/supply-check <command> [options]

Commands:
  scan        Scan dependencies and aggregate AI provenance
  report      Print a detailed attestation report
  registry    Query the attestation registry for a package
  publish     Publish an attestation to the registry (maintainers)
  check       Evaluate policies for CI pipelines
  sbom        Export attestation data as CycloneDX or SPDX

Options:
  --help      Show this help message
  --version   Show version number

Run 'npx @korext/supply-check <command> --help' for command-specific options.
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'scan':
        await require('../src/commands/scan.js')(commandArgs);
        break;
      case 'report':
        await require('../src/commands/report.js')(commandArgs);
        break;
      case 'registry':
        await require('../src/commands/registry.js')(commandArgs);
        break;
      case 'publish':
        await require('../src/commands/publish.js')(commandArgs);
        break;
      case 'check':
        await require('../src/commands/check.js')(commandArgs);
        break;
      case 'sbom':
        await require('../src/commands/sbom.js')(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error executing ${command}:`, error.message);
    process.exit(1);
  }
}

main();
