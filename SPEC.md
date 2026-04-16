# Supply Chain Attestation Specification

Version 1.0
Released under CC0 1.0 Universal (public domain).

## 1. What This Is

Supply Chain Attestation aggregates AI provenance data across a software project's dependency tree. It extends ai-attestation to answer: "What percentage of my supply chain was written with AI assistance?"

## 2. What This Is Not

This does not replace SBOM standards. It complements them by adding AI provenance data via standard extension mechanisms (CycloneDX custom properties, SPDX annotations).

It does not replace vulnerability scanners, license checkers, or build provenance tools.

## 3. Report Format

The canonical representation of a supply chain attestation is a YAML file tracking aggregate metrics and a breakdown of dependencies.

```yaml
schema: https://oss.korext.com/supply-chain/schema
version: "1.0"

project:
  name: my-application
  path: /path/to/project
  manifest: package.json
  ecosystem: npm

generated: 2026-04-15T12:00:00Z

dependencies:
  total: 847
  scanned: 823
  with_attestation: 127
  without_attestation: 696
  coverage_percentage: 15.4

ai_composition:
  weighted_percentage: 28.3
  aggregate_assisted_commits: 14236
  aggregate_total_commits: 50287

governance_tiers:
  attested: 12
  scanned: 89
  ungoverned: 722
  no_attestation: 24

tools_detected:
  - name: GitHub Copilot
    dependency_count: 78
  - name: Cursor
    dependency_count: 34

high_risk_dependencies:
  - name: some-small-lib
    version: 2.0.0
    ai_percentage: 89.0
    governance_tier: UNGOVERNED
    reason: High AI percentage without governance scanning

dependencies_detail:
  - name: lodash
    version: 4.17.21
    ecosystem: npm
    attestation_source: registry
    ai_percentage: 0.0
    governance_tier: NONE

  - name: prisma
    version: 6.2.0
    ecosystem: npm
    attestation_source: package
    ai_percentage: 41.2
    governance_tier: ATTESTED
    tools: [cursor, claude-code]
    proof_bundle_url: https://app.korext.com/verify/kpb_xyz
```

## 4. Attestation Sources

When evaluating a dependency, scanners SHOULD resolve AI provenance data in the following priority order:

1. **PACKAGE**: The attestation file (`.ai-attestation.yaml`) is included natively within the published artifact.
2. **REGISTRY**: Attestation data is hosted on a central registry (e.g., `registry.korext.com` or a private registry).
3. **REPOSITORY**: The attestation file exists at the root of the source code repository.
4. **NONE**: No data is available for the dependency.

## 5. Weighting Algorithms

To calculate the overall component of AI generated code across a project, a weighting algorithm must be selected. 

The default algorithm is **SIZE** weighting.

```
weighted_percentage = sum(dep.ai_percentage * dep.size) / sum(dep.size)
```

Other supported strategies include:
- **UNIFORM**: Each dependency contributes equally to the total average regardless of size.
- **SIZE**: Weights the percentage by the artifact size in bytes.
- **IMPORTS**: Weights the percentage by the number of times the dependency is actively referenced or imported in the project.
- **LOC**: Weights the percentage by lines of code.

## 6. Ecosystem Coverage

To ensure broad applicability, scanners MUST identify, enumerate, and evaluate dependencies across multiple ecosystems.

### 6.1 npm
- **Manifest Detection**: `package.json`
- **Tree Enumeration**: Parse `package-lock.json` or `yarn.lock` (lockfile preferred)
- **Repository URL**: `repository` field in manifest, or fallback to npm registry API (`registry.npmjs.org/{name}`)
- **Package URL**: `npmjs.com/package/{name}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in the downloaded tarball

### 6.2 PyPI
- **Manifest Detection**: `pyproject.toml`, `requirements.txt`, `Pipfile.lock`, `poetry.lock`, `setup.py`
- **Tree Enumeration**: Parse lockfile when available; else `pyproject.toml`
- **Repository URL**: PyPI JSON API (`pypi.org/pypi/{name}/json`) under `project_urls`
- **Package URL**: `pypi.org/project/{name}/{version}/`
- **Package Attestation**: Search for `.ai-attestation.yaml` in wheel (`.whl` zip file)

### 6.3 Cargo (Rust)
- **Manifest Detection**: `Cargo.toml`
- **Tree Enumeration**: Parse `Cargo.lock`
- **Repository URL**: crates.io API (`crates.io/api/v1/crates/{name}`)
- **Package URL**: `crates.io/crates/{name}/{version}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in `.crate` file

### 6.4 Go Modules
- **Manifest Detection**: `go.mod`
- **Tree Enumeration**: Parse `go.sum`
- **Repository URL**: Module path IS the repository path
- **Package URL**: `pkg.go.dev/{module}@{version}`
- **Package Attestation**: Search for `.ai-attestation.yaml` at module root

### 6.5 RubyGems
- **Manifest Detection**: `Gemfile`, `Gemfile.lock`
- **Tree Enumeration**: Parse `Gemfile.lock`
- **Repository URL**: RubyGems API (`rubygems.org/api/v1/gems/{name}.json`) under `source_code_uri` or `homepage_uri`
- **Package URL**: `rubygems.org/gems/{name}/versions/{version}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in `.gem` tar archive

### 6.6 Maven (Java)
- **Manifest Detection**: `pom.xml`, `build.gradle`, `build.gradle.kts`
- **Tree Enumeration**: Parse `pom.xml` via xml resolution (or `mvn dependency:list`), or parse gradle structures via Maven Central API
- **Repository URL**: Maven Central Search API (`search.maven.org/solrsearch/select`) under `scmUrl` or `projectUrl`
- **Package URL**: `central.sonatype.com/artifact/{group}/{artifact}/{version}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in JAR under `META-INF/`

### 6.7 NuGet (.NET)
- **Manifest Detection**: `*.csproj`, `packages.config`, `*.sln`, `*.fsproj`, `*.vbproj`
- **Tree Enumeration**: Parse `.csproj` scanning `<PackageReference>` and `<PackageVersion>`
- **Repository URL**: NuGet API (`api.nuget.org/v3-flatcontainer/{name}/{version}/{name}.nuspec`) extracting `repository` and `projectUrl`
- **Package URL**: `nuget.org/packages/{name}/{version}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in `.nupkg` zip archive

### 6.8 Composer (PHP)
- **Manifest Detection**: `composer.json`, `composer.lock`
- **Tree Enumeration**: Parse `composer.lock`
- **Repository URL**: Packagist API (`repo.packagist.org/p2/{name}.json`) reading `source`
- **Package URL**: `packagist.org/packages/{name}`
- **Package Attestation**: Search for `.ai-attestation.yaml` in package archive

## 7. SBOM Integration

To ensure broad industry compatibility, AI provenance data MUST be embeddable within standard Software Bill of Materials (SBOM) documents using standardized extension mechanisms.

All properties MUST use the `korext:` namespace prefix to avoid collisions.

Supported properties:
- `korext:ai_percentage` (float 0 to 100)
- `korext:governance_tier` (NONE, UNGOVERNED, SCANNED, ATTESTED, NO_ATTESTATION)
- `korext:attestation_source` (package, registry, repository, none)
- `korext:attestation_url` (origin URL)
- `korext:tools` (comma separated list of identifiers)
- `korext:proof_bundle_url` (URL, optional)

### 7.1 CycloneDX 1.6

CycloneDX supports extensions via Custom Properties.

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "components": [
    {
      "name": "lodash",
      "version": "4.17.21",
      "properties": [
        {
          "name": "korext:ai_percentage",
          "value": "0.0"
        },
        {
          "name": "korext:governance_tier",
          "value": "NONE"
        },
        {
          "name": "korext:attestation_source",
          "value": "registry"
        },
        {
          "name": "korext:attestation_url",
          "value": "https://oss.korext.com/registry/npm/lodash"
        }
      ]
    }
  ]
}
```

### 7.2 SPDX 2.3

SPDX supports extensions via Annotations of type `OTHER`.

```json
{
  "spdxVersion": "SPDX-2.3",
  "packages": [
    {
      "name": "lodash",
      "versionInfo": "4.17.21",
      "annotations": [
        {
          "annotationType": "OTHER",
          "annotator": "Tool: korext-supply-check",
          "annotationDate": "2026-04-15T12:00:00Z",
          "annotationComment": "korext:ai_percentage=0.0; korext:governance_tier=NONE; korext:attestation_source=registry"
        }
      ]
    }
  ]
}
```

## 8. Private Registries

Enterprises may host private registries mirroring or replacing the public registry to evaluate internal packages.

Configuration is declared in a `.supply-check.yaml` file located in the project root:

```yaml
registries:
  - name: public
    url: https://oss.korext.com/registry
    priority: 1

  - name: acme-internal
    url: https://korext.acme.com/registry
    priority: 2
    auth:
      type: token
      env: ACME_KOREXT_TOKEN
```

Federated resolution supports querying across registries based on priority order. Authentication relies on standard HTTP headers using specified tokens.
