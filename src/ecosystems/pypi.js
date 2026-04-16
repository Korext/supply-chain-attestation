const fs = require('fs');
const path = require('path');

let toml;
try { toml = require('@iarna/toml'); } catch (e) { toml = null; }

class PypiAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
           fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
           fs.existsSync(path.join(projectPath, 'Pipfile.lock')) ||
           fs.existsSync(path.join(projectPath, 'poetry.lock')) ||
           fs.existsSync(path.join(projectPath, 'setup.py'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];

    // Priority: poetry.lock > Pipfile.lock > requirements.txt > pyproject.toml
    const poetryLock = path.join(projectPath, 'poetry.lock');
    const pipfileLock = path.join(projectPath, 'Pipfile.lock');
    const requirements = path.join(projectPath, 'requirements.txt');
    const pyproject = path.join(projectPath, 'pyproject.toml');

    if (fs.existsSync(poetryLock) && toml) {
      const lock = toml.parse(fs.readFileSync(poetryLock, 'utf8'));
      if (lock.package) {
        for (const pkg of lock.package) {
          deps.push({
            name: pkg.name,
            version: pkg.version || 'unknown',
            ecosystem: 'pypi',
            resolved: null
          });
        }
      }
    } else if (fs.existsSync(pipfileLock)) {
      const lock = JSON.parse(fs.readFileSync(pipfileLock, 'utf8'));
      for (const section of ['default', 'develop']) {
        if (lock[section]) {
          for (const [name, info] of Object.entries(lock[section])) {
            deps.push({
              name,
              version: (info.version || '').replace('==', ''),
              ecosystem: 'pypi',
              resolved: info.index || null
            });
          }
        }
      }
    } else if (fs.existsSync(requirements)) {
      const content = fs.readFileSync(requirements, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
        const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*(?:[=<>!~]+\s*(.+))?/);
        if (match) {
          deps.push({
            name: match[1],
            version: match[2] ? match[2].split(',')[0].trim() : 'unknown',
            ecosystem: 'pypi',
            resolved: null
          });
        }
      }
    } else if (fs.existsSync(pyproject) && toml) {
      const config = toml.parse(fs.readFileSync(pyproject, 'utf8'));
      const projDeps = config.project && config.project.dependencies;
      if (Array.isArray(projDeps)) {
        for (const dep of projDeps) {
          const match = dep.match(/^([a-zA-Z0-9_.-]+)/);
          if (match) {
            deps.push({ name: match[1], version: 'unknown', ecosystem: 'pypi', resolved: null });
          }
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://pypi.org/pypi/${dep.name}/json`;
  }

  getPackageUrl(dep) {
    return `https://pypi.org/project/${dep.name}/${dep.version}/`;
  }

  getRegistryNamespace() {
    return 'pypi';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new PypiAdapter();
