const fs = require('fs');
const path = require('path');

let toml;
try { toml = require('@iarna/toml'); } catch (e) { toml = null; }

class CargoAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'Cargo.toml'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'Cargo.lock');

    if (fs.existsSync(lockPath) && toml) {
      const lock = toml.parse(fs.readFileSync(lockPath, 'utf8'));
      if (lock.package) {
        for (const pkg of lock.package) {
          // Skip the root package (first entry is usually the project itself)
          if (pkg.source) {
            deps.push({
              name: pkg.name,
              version: pkg.version || 'unknown',
              ecosystem: 'cargo',
              resolved: pkg.source || null
            });
          }
        }
      }
    } else if (toml) {
      // Fallback: parse Cargo.toml direct dependencies
      const manifest = toml.parse(fs.readFileSync(path.join(projectPath, 'Cargo.toml'), 'utf8'));
      const sections = [manifest.dependencies, manifest['dev-dependencies'], manifest['build-dependencies']];
      for (const section of sections) {
        if (!section) continue;
        for (const [name, value] of Object.entries(section)) {
          const version = typeof value === 'string' ? value : (value.version || 'unknown');
          deps.push({ name, version, ecosystem: 'cargo', resolved: null });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://crates.io/api/v1/crates/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://crates.io/crates/${dep.name}/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'cargo';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new CargoAdapter();
