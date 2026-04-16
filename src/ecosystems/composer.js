const fs = require('fs');
const path = require('path');

class ComposerAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'composer.json')) ||
           fs.existsSync(path.join(projectPath, 'composer.lock'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'composer.lock');
    const jsonPath = path.join(projectPath, 'composer.json');

    if (fs.existsSync(lockPath)) {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      for (const section of ['packages', 'packages-dev']) {
        if (lock[section]) {
          for (const pkg of lock[section]) {
            deps.push({
              name: pkg.name,
              version: (pkg.version || 'unknown').replace(/^v/, ''),
              ecosystem: 'composer',
              resolved: pkg.source ? pkg.source.url : null
            });
          }
        }
      }
    } else if (fs.existsSync(jsonPath)) {
      const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const sections = [config.require, config['require-dev']];
      for (const section of sections) {
        if (!section) continue;
        for (const [name, versionConstraint] of Object.entries(section)) {
          if (name === 'php' || name.startsWith('ext-')) continue;
          deps.push({
            name,
            version: versionConstraint.replace(/^[\^~>=<]/, ''),
            ecosystem: 'composer',
            resolved: null
          });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://repo.packagist.org/p2/${dep.name}.json`;
  }

  getPackageUrl(dep) {
    return `https://packagist.org/packages/${dep.name}`;
  }

  getRegistryNamespace() {
    return 'composer';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new ComposerAdapter();
