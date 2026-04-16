# Contributing to Supply Chain Attestation

Thank you for your interest in contributing to Supply Chain Attestation!

We welcome pull requests for:
- New ecosystem adapters (or enhancements to existing ones)
- Bug fixes in the CLI
- Enhancements to the private registry stack
- Tool identifier registry additions

## Adding a New Ecosystem Adapter

1. Create `src/ecosystems/<name>.js`
2. Implement the `Adapter` interface:
   - `detect()` 
   - `enumerateDependencies()`
   - `getRepositoryUrl()`
   - `getPackageUrl()`
   - `getRegistryNamespace()`
   - `fetchPackageAttestation()`
3. Ensure it runs smoothly and fetches attestations where supported.
4. Export it in `src/ecosystems/index.js`

## Issues
Please open an issue before submitting a large PR so we can discuss the approach.

## Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
