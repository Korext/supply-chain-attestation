const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class CondaAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'environment.yml')) ||
           fs.existsSync(path.join(projectPath, 'environment.yaml')) ||
           fs.existsSync(path.join(projectPath, 'conda-lock.yml'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const lockPath = path.join(projectPath, 'conda-lock.yml');
    const envYml = path.join(projectPath, 'environment.yml');
    const envYaml = path.join(projectPath, 'environment.yaml');

    if (fs.existsSync(lockPath)) {
      const content = fs.readFileSync(lockPath, 'utf8');
      const lock = yaml.load(content);
      if (lock && lock.package) {
        for (const pkg of lock.package) {
          deps.push({
            name: pkg.name,
            version: pkg.version || 'unknown',
            ecosystem: 'conda',
            resolved: pkg.url || null
          });
        }
      }
    } else {
      // Parse environment.yml
      const envPath = fs.existsSync(envYml) ? envYml : (fs.existsSync(envYaml) ? envYaml : null);
      if (envPath) {
        const content = fs.readFileSync(envPath, 'utf8');
        const env = yaml.load(content);
        if (env && env.dependencies) {
          for (const dep of env.dependencies) {
            if (typeof dep === 'string') {
              // Format: "package=version=build" or "package>=version"
              const parts = dep.split(/[=><]+/);
              const name = parts[0].trim();
              const version = parts[1] ? parts[1].trim() : 'unknown';
              deps.push({ name, version, ecosystem: 'conda', resolved: null });
            } else if (typeof dep === 'object' && dep.pip) {
              // pip sub-dependencies inside conda env
              for (const pipDep of dep.pip) {
                const parts = pipDep.split(/[=><]+/);
                const name = parts[0].trim();
                const version = parts[1] ? parts[1].trim() : 'unknown';
                deps.push({ name, version, ecosystem: 'conda', resolved: null });
              }
            }
          }
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    return `https://anaconda.org/conda-forge/${dep.name}`;
  }

  getPackageUrl(dep) {
    return `https://anaconda.org/conda-forge/${dep.name}/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'conda';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new CondaAdapter();
