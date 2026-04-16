const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml');

class NpmAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'package.json'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];

    // Prefer lockfile for full tree
    const lockPath = path.join(projectPath, 'package-lock.json');
    const yarnLockPath = path.join(projectPath, 'yarn.lock');

    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

      // npm lockfile v3 uses "packages", v2 uses "dependencies"
      if (lock.packages) {
        for (const [pkgPath, info] of Object.entries(lock.packages)) {
          if (pkgPath === '') continue; // root package
          const name = pkgPath.replace(/^node_modules\//, '').replace(/.*node_modules\//, '');
          if (!name || name.startsWith('.')) continue;
          deps.push({
            name,
            version: info.version || 'unknown',
            ecosystem: 'npm',
            resolved: info.resolved || null
          });
        }
      } else if (lock.dependencies) {
        const walk = (depMap) => {
          for (const [name, info] of Object.entries(depMap)) {
            deps.push({
              name,
              version: info.version || 'unknown',
              ecosystem: 'npm',
              resolved: info.resolved || null
            });
            if (info.dependencies) walk(info.dependencies);
          }
        };
        walk(lock.dependencies);
      }
    } else if (fs.existsSync(yarnLockPath)) {
      // Basic yarn.lock parsing
      const content = fs.readFileSync(yarnLockPath, 'utf8');
      const lines = content.split('\n');
      let currentName = null;
      for (const line of lines) {
        if (line && !line.startsWith(' ') && !line.startsWith('#') && line.includes('@')) {
          // Extract package name from yarn.lock entry line
          const match = line.match(/^"?(@?[^@"]+)@/);
          if (match) currentName = match[1];
        }
        if (currentName && line.trim().startsWith('version ')) {
          const version = line.trim().replace('version ', '').replace(/"/g, '');
          deps.push({ name: currentName, version, ecosystem: 'npm', resolved: null });
          currentName = null;
        }
      }
    } else {
      // Fallback to package.json direct deps only
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, versionRange] of Object.entries(allDeps)) {
        deps.push({
          name,
          version: versionRange.replace(/^[\^~>=<]/, ''),
          ecosystem: 'npm',
          resolved: null
        });
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://registry.npmjs.org/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://npmjs.com/package/${dep.name}`;
  }

  getRegistryNamespace() {
    return 'npm';
  }

  fetchPackageAttestation(dep) {
    // In production: download tarball, extract .ai-attestation.yaml
    // For v1.0: returns null (no packages have embedded attestations yet)
    return null;
  }
}

module.exports = new NpmAdapter();
