const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class PubAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'pubspec.yaml')) ||
           fs.existsSync(path.join(projectPath, 'pubspec.lock'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'pubspec.lock');
    const specPath = path.join(projectPath, 'pubspec.yaml');

    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, 'utf8');
      const lock = yaml.load(content);
      if (lock && lock.packages) {
        for (const [name, info] of Object.entries(lock.packages)) {
          // Skip SDK packages
          if (info.source === 'sdk') continue;
          deps.push({
            name,
            version: info.version || 'unknown',
            ecosystem: 'pub',
            resolved: info.description && info.description.url ? info.description.url : null
          });
        }
      }
    } else if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf8');
      const spec = yaml.load(content);
      const sections = [spec.dependencies, spec.dev_dependencies];
      for (const section of sections) {
        if (!section) continue;
        for (const [name, value] of Object.entries(section)) {
          if (name === 'flutter' || name === 'flutter_test') continue;
          const version = typeof value === 'string' ? value.replace(/^\^/, '') : 'unknown';
          deps.push({ name, version, ecosystem: 'pub', resolved: null });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://pub.dev/api/packages/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://pub.dev/packages/${dep.name}/versions/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'pub';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new PubAdapter();
