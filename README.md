# Supply Chain Attestation

AI provenance across your entire dependency tree. Eight ecosystems. SBOM integration. Private registry support.

[![License: Code](https://img.shields.io/badge/code-Apache%202.0-blue)](LICENSE)
[![License: Spec](https://img.shields.io/badge/spec-CC0%201.0-green)](LICENSE-SPEC)
[![npm](https://img.shields.io/npm/v/@korext/supply-check)](https://www.npmjs.com/package/@korext/supply-check)

You know your vulnerabilities thanks to Snyk and Dependabot. You know your licenses thanks to FOSSA. But you do not know what percentage of your software supply chain was written with AI assistance.

Supply Chain Attestation answers that across eight package ecosystems, integrates with CycloneDX and SPDX, and supports private registries for enterprise deployment.

## Quick Start

\`\`\`bash
npx @korext/supply-check scan
\`\`\`

## Supported Ecosystems (All Ready in v1.0)

| Ecosystem | Status |
|-----------|--------|
| npm | Ready |
| PyPI | Ready |
| Cargo | Ready |
| Go Modules | Ready |
| RubyGems | Ready |
| Maven | Ready |
| NuGet | Ready |
| Composer | Ready |

## Example Output

\`\`\`
Supply Chain Attestation

Ecosystem: npm
Dependencies: 847 total, 823 scanned

AI Coverage: 127 dependencies (15.4%)
Weighted AI Percentage: 28.3%

Governance Distribution:
  ATTESTED: 12 dependencies
  SCANNED: 89 dependencies
  UNGOVERNED: 722 dependencies
  NO_ATTESTATION: 24 dependencies

High Risk Dependencies: 3
  some-small-lib@2.0.0: 89% AI, ungoverned
  another-lib@1.2.3: 65% AI, ungoverned
  one-more@0.9.0: 72% AI, no attestation
\`\`\`

## Three Attestation Sources

1. **Package**: Dependency's published artifact includes \`.ai-attestation.yaml\`
2. **Registry**: Data hosted at \`oss.korext.com/registry/\` (automated scans + maintainer submissions)
3. **Repository**: Dependency's source repo has \`.ai-attestation.yaml\`

Priority: Package > Registry > Repository

## Commands

| Command | Description |
|---------|-------------|
| \`scan\` | Scan dependency tree |
| \`report\` | Print detailed report |
| \`registry\` | Query registry |
| \`publish\` | Publish attestation (maintainers) |
| \`check\` | Policy gate for CI |
| \`sbom\` | Export CycloneDX or SPDX |

## SBOM Integration

\`\`\`bash
npx @korext/supply-check sbom --format cyclonedx > sbom.json
npx @korext/supply-check sbom --format spdx > sbom.spdx.json
\`\`\`

AI data embedded via standard extension mechanisms:
- CycloneDX 1.6: \`properties\` array with \`korext:\` namespace
- SPDX 2.3: \`annotations\` with \`korext:\` properties

Compatible with any SBOM consumer.

## CI/CD

\`\`\`yaml
- uses: korext/supply-chain-attestation/action@v1
  with:
    max-ai-percentage: 40
    max-high-risk: 5
    block-ungoverned-ai: true
    require-attested-for: "*payment*"
    sbom-output: cyclonedx
\`\`\`

## Private Registry (Enterprise)

Run your own registry for internal packages or mirror the public registry.

Four storage backends: Cloud Storage, S3, Azure Blob, local filesystem.

Authentication: OAuth, SAML, or API tokens.

Deployment: Docker, Kubernetes, or Docker Compose manifests included.

See [PRIVATE-REGISTRY.md](docs/PRIVATE-REGISTRY.md).

## For Package Maintainers

\`\`\`bash
npx @korext/ai-attestation init
npx @korext/supply-check publish
\`\`\`

Add the badge:

\`\`\`markdown
[![AI Attestation](https://oss.korext.com/supply-chain/badge/npm/YOUR-PACKAGE)](https://oss.korext.com/supply-chain/registry/npm/YOUR-PACKAGE)
\`\`\`

## What This Complements

- **SBOM tools** (CycloneDX, SPDX): adds AI data via standard extensions
- **Vulnerability scanners** (Snyk, Dependabot): different concern
- **License checkers** (FOSSA): different concern
- **Build provenance** (Sigstore, SLSA): different concern

## Specification

See [SPEC.md](SPEC.md). CC0 1.0 (public domain).

## Prior Art

See [PRIOR_ART.md](PRIOR_ART.md).

## Built by

[Korext](https://korext.com) builds AI code governance tools.
