const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

class NuGetAdapter {
  detect(projectPath) {
    if (fs.existsSync(path.join(projectPath, 'packages.config'))) return true;
    try {
      const files = fs.readdirSync(projectPath);
      return files.some(f => f.endsWith('.csproj') || f.endsWith('.fsproj') ||
                              f.endsWith('.vbproj') || f.endsWith('.sln'));
    } catch (e) {
      return false;
    }
  }

  enumerateDependencies(projectPath) {
    const deps = [];

    // Find all .csproj files
    const findProjects = (dir) => {
      const results = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules' || entry.name === 'bin' || entry.name === 'obj') continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...findProjects(fullPath));
          } else if (entry.name.endsWith('.csproj') || entry.name.endsWith('.fsproj') || entry.name.endsWith('.vbproj')) {
            results.push(fullPath);
          }
        }
      } catch (e) { /* skip inaccessible dirs */ }
      return results;
    };

    const projectFiles = findProjects(projectPath);
    const seen = new Set();

    for (const projFile of projectFiles) {
      const content = fs.readFileSync(projFile, 'utf8');
      let parsed = null;
      xml2js.parseString(content, { async: false }, (err, result) => {
        if (!err) parsed = result;
      });

      if (parsed && parsed.Project && parsed.Project.ItemGroup) {
        for (const group of parsed.Project.ItemGroup) {
          if (group.PackageReference) {
            for (const ref of group.PackageReference) {
              const attrs = ref.$ || {};
              const name = attrs.Include || attrs.Update || '';
              const version = attrs.Version || 'unknown';
              const key = `${name}@${version}`;
              if (name && !seen.has(key)) {
                seen.add(key);
                deps.push({ name, version, ecosystem: 'nuget', resolved: null });
              }
            }
          }
        }
      }
    }

    // Also check packages.config
    const pkgConfigPath = path.join(projectPath, 'packages.config');
    if (fs.existsSync(pkgConfigPath)) {
      const content = fs.readFileSync(pkgConfigPath, 'utf8');
      let parsed = null;
      xml2js.parseString(content, { async: false }, (err, result) => {
        if (!err) parsed = result;
      });
      if (parsed && parsed.packages && parsed.packages.package) {
        for (const pkg of parsed.packages.package) {
          const attrs = pkg.$ || {};
          const key = `${attrs.id}@${attrs.version}`;
          if (attrs.id && !seen.has(key)) {
            seen.add(key);
            deps.push({ name: attrs.id, version: attrs.version || 'unknown', ecosystem: 'nuget', resolved: null });
          }
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://api.nuget.org/v3-flatcontainer/${dep.name.toLowerCase()}/${dep.version}/${dep.name.toLowerCase()}.nuspec`;
  }

  getPackageUrl(dep) {
    return `https://nuget.org/packages/${dep.name}/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'nuget';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new NuGetAdapter();
