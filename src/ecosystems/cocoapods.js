const fs = require('fs');
const path = require('path');

class CocoaPodsAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'Podfile')) ||
           fs.existsSync(path.join(projectPath, 'Podfile.lock'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'Podfile.lock');

    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, 'utf8');
      // Parse PODS section: lines like "  - PodName (1.2.3):" or "  - PodName (1.2.3)"
      let inPods = false;
      for (const line of content.split('\n')) {
        if (line.trim() === 'PODS:') { inPods = true; continue; }
        if (inPods && line.match(/^\S/) && line.trim() !== 'PODS:') {
          inPods = false;
          continue;
        }
        if (inPods && line.match(/^\s{2}- \S/)) {
          // Top-level pod (2 spaces indent)
          const match = line.trim().replace(/^- /, '').match(/^(\S+)\s+\((.+?)\)/);
          if (match) {
            deps.push({
              name: match[1],
              version: match[2],
              ecosystem: 'cocoapods',
              resolved: null
            });
          }
        }
      }
    } else {
      // Fallback: parse Podfile for pod declarations
      const podfilePath = path.join(projectPath, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        const content = fs.readFileSync(podfilePath, 'utf8');
        const pattern = /^\s*pod\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?/gm;
        let match;
        while ((match = pattern.exec(content)) !== null) {
          deps.push({
            name: match[1],
            version: match[2] ? match[2].replace(/^[~>=<]+ */, '') : 'unknown',
            ecosystem: 'cocoapods',
            resolved: null
          });
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://cdn.cocoapods.org/all_pods_versions_${dep.name.charAt(0).toLowerCase()}_${dep.name.charAt(1).toLowerCase()}_${dep.name.charAt(2).toLowerCase()}.txt`;
  }

  getPackageUrl(dep) {
    return `https://cocoapods.org/pods/${dep.name}`;
  }

  getRegistryNamespace() {
    return 'cocoapods';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new CocoaPodsAdapter();
