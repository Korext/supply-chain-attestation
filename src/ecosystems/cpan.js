const fs = require('fs');
const path = require('path');

class CpanAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'cpanfile')) ||
           fs.existsSync(path.join(projectPath, 'cpanfile.snapshot')) ||
           fs.existsSync(path.join(projectPath, 'META.json')) ||
           fs.existsSync(path.join(projectPath, 'Makefile.PL'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];

    // Priority: cpanfile.snapshot > META.json > cpanfile
    const snapshotPath = path.join(projectPath, 'cpanfile.snapshot');
    const metaPath = path.join(projectPath, 'META.json');
    const cpanfilePath = path.join(projectPath, 'cpanfile');

    if (fs.existsSync(snapshotPath)) {
      const content = fs.readFileSync(snapshotPath, 'utf8');
      // Parse Carton snapshot format: distribution lines like "Module-Name-1.23"
      let currentDist = null;
      for (const line of content.split('\n')) {
        const distMatch = line.match(/^\s{2}(\S+)-(\d[\d.]*\d?)$/);
        if (distMatch) {
          deps.push({
            name: distMatch[1].replace(/-/g, '::'),
            version: distMatch[2],
            ecosystem: 'cpan',
            resolved: null
          });
        }
      }
    } else if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const prereqs = meta.prereqs || {};
      for (const phase of Object.values(prereqs)) {
        for (const type of Object.values(phase)) {
          for (const [name, version] of Object.entries(type)) {
            if (name === 'perl') continue;
            deps.push({
              name,
              version: version || '0',
              ecosystem: 'cpan',
              resolved: null
            });
          }
        }
      }
    } else if (fs.existsSync(cpanfilePath)) {
      const content = fs.readFileSync(cpanfilePath, 'utf8');
      // Parse cpanfile: requires 'Module::Name', '1.23';
      const pattern = /requires\s+['"]([^'"]+)['"]\s*(?:,\s*['"]?([^'";]+)['"]?\s*)?;/g;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        deps.push({
          name: match[1],
          version: match[2] ? match[2].trim() : '0',
          ecosystem: 'cpan',
          resolved: null
        });
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    const distName = dep.name.replace(/::/g, '-');
    return `https://metacpan.org/pod/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://metacpan.org/release/${dep.name.replace(/::/g, '-')}`;
  }

  getRegistryNamespace() {
    return 'cpan';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new CpanAdapter();
