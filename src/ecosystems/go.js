const fs = require('fs');
const path = require('path');

class GoAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'go.mod'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const sumPath = path.join(projectPath, 'go.sum');
    const modPath = path.join(projectPath, 'go.mod');

    if (fs.existsSync(sumPath)) {
      const content = fs.readFileSync(sumPath, 'utf8');
      const seen = new Set();
      for (const line of content.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const modulePath = parts[0];
          let version = parts[1].replace('/go.mod', '');
          const key = `${modulePath}@${version}`;
          if (!seen.has(key)) {
            seen.add(key);
            deps.push({
              name: modulePath,
              version,
              ecosystem: 'go',
              resolved: null
            });
          }
        }
      }
    } else if (fs.existsSync(modPath)) {
      // Fallback: parse require block from go.mod
      const content = fs.readFileSync(modPath, 'utf8');
      let inRequire = false;
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === 'require (') { inRequire = true; continue; }
        if (trimmed === ')') { inRequire = false; continue; }
        if (inRequire || trimmed.startsWith('require ')) {
          const reqLine = trimmed.replace('require ', '');
          const parts = reqLine.trim().split(/\s+/);
          if (parts.length >= 2) {
            deps.push({
              name: parts[0],
              version: parts[1],
              ecosystem: 'go',
              resolved: null
            });
          }
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    // Module path IS the repository path
    return `https://${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://pkg.go.dev/${dep.name}@${dep.version}`;
  }

  getRegistryNamespace() {
    return 'go';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new GoAdapter();
