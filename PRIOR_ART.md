# Prior Art

Supply Chain Attestation introduces standard mechanisms to track and aggregate AI authorship provenance across a dependency tree. This document reviews and distinguishes this standard from existing prior art in software supply chain tooling.

## SBOM Formats

Software Bill of Materials (SBOM) formats are critical enabling technologies for Supply Chain Attestation. This standard does NOT replace CycloneDX or SPDX; rather, it extends them by embedding AI provenance data using their native extension mechanisms.

### CycloneDX 1.6

The CycloneDX specification provides a widely adopted SBOM format primarily focused on supply chain security and component inventory.

**Scope vs AI Attestation:** CycloneDX captures component identity, versions, vulnerabilities, and license metadata. It does not natively provide formal fields for tracking AI authorship percentages, generative AI tools used, or AI governance tiers. 

**Integration Point:** In accordance with the CycloneDX specification, AI Attestation data integrates seamlessly into CycloneDX 1.6 structured documents via the `properties` array on individual `components`. All fields use the `korext:` namespace to prevent collisions (e.g., `korext:ai_percentage`, `korext:governance_tier`).

### SPDX 2.3

The Software Package Data Exchange (SPDX) specification is an open standard for communicating software bill of materials information, including components, licenses, copyrights, and security references.

**Scope vs AI Attestation:** Similar to CycloneDX, SPDX 2.3 does not define specific fields for declaring AI authorship or tooling provenance.

**Integration Point:** Following the SPDX 2.3 specification, custom fields and AI Attestation data integrate via the `Annotations` mechanism. By creating an annotation of type `OTHER` bound to a specific package identifier, the scanner embeds structured key-value pairs representing the dependency's AI provenance.

## Build Provenance and Integrity

Build provenance tools aim to guarantee that the compiled artifact matches the source code and that the build pipeline was not tampered with.

### Sigstore & SLSA

Sigstore provides a protocol for cryptographically signing software artifacts. SLSA (Supply-chain Levels for Software Artifacts) provides a framework and maturity model for establishing supply chain integrity.

**Scope vs AI Attestation:** These tools establish trust *after* code is committed (authenticating the developer and the CI/CD pipeline). They answer "Who built this and how?" Supply Chain Attestation, on the other hand, establishes trust *during* code authorship. It answers "Who or what wrote this source code?"

### In-toto

The in-toto framework secures the integrity of software supply chains by verifying that each step of the pipeline was performed according to predefined rules.

**Scope vs AI Attestation:** Like SLSA, in-toto prevents tampering between steps in a supply chain (e.g., verifying that the artifact deployed was the artifact tested). It does not attest to the initial AI or human authorship of the component's source.

## Security Scanning & Vulnerability Management

This category of tooling includes Dependabot, Snyk, Socket, Grype, and OSV-Scanner.

**Scope vs AI Attestation:** These tools focus primarily on detecting known Common Vulnerabilities and Exposures (CVEs) in dependency trees, or identifying malicious behavior like typosquatting or compromised packages. They are essential for security but do not address the distinct compliance, ownership, or intellectual property implications of AI-generated code.

## License Compliance

License scanning tools like FOSSA, WhiteSource (Mend), and ORT ensure that dependency licenses are compatible with the project's licensing requirements.

**Scope vs AI Attestation:** These tools scan for traditional open-source software licenses (MIT, GPL, Apache). They do not identify whether a package's underlying source includes AI-authored code that falls outside traditional copyright protections. Supply Chain Attestation bridges this gap by mapping AI provenance transparently across the dependency tree so that organizations can enforce AI development policies.
