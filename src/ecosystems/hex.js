const fs = require('fs');
const path = require('path');

class HexAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'mix.exs')) ||
           fs.existsSync(path.join(projectPath, 'mix.lock'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'mix.lock');

    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, 'utf8');
      // mix.lock is an Elixir map literal. Parse entries like:
      // "package_name": {:hex, :package_name, "1.2.3", ...}
      const pattern = /"([^"]+)":\s*\{:hex,\s*:([^,]+),\s*"([^"]+)"/g;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        deps.push({
          name: match[1],
          version: match[3],
          ecosystem: 'hex',
          resolved: null
        });
      }

      // Also handle git dependencies:
      // "dep": {:git, "https://github.com/...", "commit_sha", ...}
      const gitPattern = /"([^"]+)":\s*\{:git,\s*"([^"]+)",\s*"([^"]+)"/g;
      while ((match = gitPattern.exec(content)) !== null) {
        deps.push({
          name: match[1],
          version: match[3].substring(0, 7), // short commit sha
          ecosystem: 'hex',
          resolved: match[2]
        });
      }
    } else {
      // Fallback: parse mix.exs for deps function
      const mixPath = path.join(projectPath, 'mix.exs');
      if (fs.existsSync(mixPath)) {
        const content = fs.readFileSync(mixPath, 'utf8');
        // Match {:dep_name, "~> 1.0"} style entries
        const pattern = /\{:(\w+),\s*"([^"]+)"\}/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          deps.push({
            name: match[1],
            version: match[2].replace(/^~>\s*/, ''),
            ecosystem: 'hex',
            resolved: null
          });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://hex.pm/api/packages/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://hex.pm/packages/${dep.name}/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'hex';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new HexAdapter();
