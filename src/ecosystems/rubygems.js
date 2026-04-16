const fs = require('fs');
const path = require('path');

class RubyGemsAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'Gemfile')) ||
           fs.existsSync(path.join(projectPath, 'Gemfile.lock'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'Gemfile.lock');

    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, 'utf8');
      let inSpecs = false;
      for (const line of content.split('\n')) {
        if (line.trim() === 'specs:') { inSpecs = true; continue; }
        if (inSpecs && line.match(/^\s{4}\S/)) {
          // Lines indented with exactly 4 spaces are top-level gems
          const match = line.trim().match(/^(\S+)\s+\((.+)\)/);
          if (match) {
            deps.push({
              name: match[1],
              version: match[2],
              ecosystem: 'rubygems',
              resolved: null
            });
          }
        }
        // Stop when we hit a non-indented line after specs
        if (inSpecs && line.match(/^\S/) && line.trim() !== 'specs:') {
          inSpecs = false;
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://rubygems.org/api/v1/gems/${dep.name}.json`;
  }

  getPackageUrl(dep) {
    return `https://rubygems.org/gems/${dep.name}/versions/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'rubygems';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new RubyGemsAdapter();
