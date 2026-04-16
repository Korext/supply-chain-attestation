const fs = require('fs');
const path = require('path');

class SwiftAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'Package.swift')) ||
           fs.existsSync(path.join(projectPath, 'Package.resolved'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const resolvedPath = path.join(projectPath, 'Package.resolved');

    if (fs.existsSync(resolvedPath)) {
      const resolved = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

      // Package.resolved v2 (Xcode 13+) and v3
      const pins = resolved.pins || (resolved.object && resolved.object.pins) || [];
      for (const pin of pins) {
        const identity = pin.identity || pin.package || '';
        const location = pin.location || (pin.repositoryURL || '');
        const version = (pin.state && pin.state.version) || 'unknown';
        deps.push({
          name: identity,
          version,
          ecosystem: 'swift',
          resolved: location || null
        });
      }
    } else {
      // Fallback: parse Package.swift for .package(url:...) declarations
      const manifestPath = path.join(projectPath, 'Package.swift');
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const pattern = /\.package\s*\(\s*url:\s*"([^"]+)"\s*,\s*(?:from:\s*"([^"]+)"|\.upToNextMajor\(from:\s*"([^"]+)"\)|exact:\s*"([^"]+)")/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const url = match[1];
          const version = match[2] || match[3] || match[4] || 'unknown';
          const name = url.split('/').pop().replace(/\.git$/, '');
          deps.push({ name, version, ecosystem: 'swift', resolved: url });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return dep.resolved || `https://github.com/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://swiftpackageindex.com/search?query=${dep.name}`;
  }

  getRegistryNamespace() {
    return 'swift';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new SwiftAdapter();
