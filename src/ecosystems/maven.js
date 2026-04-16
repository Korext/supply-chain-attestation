const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

class MavenAdapter {
  detect(projectPath) {
    return fs.existsSync(path.join(projectPath, 'pom.xml')) ||
           fs.existsSync(path.join(projectPath, 'build.gradle')) ||
           fs.existsSync(path.join(projectPath, 'build.gradle.kts'));
  }

  enumerateDependencies(projectPath) {
    const deps = [];
    const pomPath = path.join(projectPath, 'pom.xml');
    const gradlePath = path.join(projectPath, 'build.gradle');
    const gradleKtsPath = path.join(projectPath, 'build.gradle.kts');

    if (fs.existsSync(pomPath)) {
      const content = fs.readFileSync(pomPath, 'utf8');
      // Synchronous XML parsing
      let parsed = null;
      xml2js.parseString(content, { async: false }, (err, result) => {
        if (!err) parsed = result;
      });

      if (parsed && parsed.project && parsed.project.dependencies) {
        const depBlock = parsed.project.dependencies[0];
        if (depBlock && depBlock.dependency) {
          for (const d of depBlock.dependency) {
            const groupId = d.groupId ? d.groupId[0] : '';
            const artifactId = d.artifactId ? d.artifactId[0] : '';
            const version = d.version ? d.version[0] : 'unknown';
            deps.push({
              name: `${groupId}:${artifactId}`,
              group: groupId,
              artifact: artifactId,
              version,
              ecosystem: 'maven',
              resolved: null
            });
          }
        }
      }
    } else if (fs.existsSync(gradlePath) || fs.existsSync(gradleKtsPath)) {
      const filePath = fs.existsSync(gradlePath) ? gradlePath : gradleKtsPath;
      const content = fs.readFileSync(filePath, 'utf8');
      // Parse implementation/api/compile dependency declarations
      const patterns = [
        /(?:implementation|api|compile|testImplementation|runtimeOnly)\s*\(?['"]([^'"]+):([^'"]+):([^'"]+)['"]/g,
        /(?:implementation|api|compile|testImplementation|runtimeOnly)\s*\(?['"]([^'"]+):([^'"]+)['"]/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[3]) {
            deps.push({
              name: `${match[1]}:${match[2]}`,
              group: match[1],
              artifact: match[2],
              version: match[3],
              ecosystem: 'maven',
              resolved: null
            });
          } else {
            deps.push({
              name: `${match[1]}:${match[2]}`,
              group: match[1],
              artifact: match[2],
              version: 'unknown',
              ecosystem: 'maven',
              resolved: null
            });
          }
        }
      }
    }

    return deps;
  }

  getRepositoryUrl(dep) {
    const group = dep.group || dep.name.split(':')[0];
    const artifact = dep.artifact || dep.name.split(':')[1];
    return `https://search.maven.org/solrsearch/select?q=g:${group}+AND+a:${artifact}`;
  }

  getPackageUrl(dep) {
    const group = dep.group || dep.name.split(':')[0];
    const artifact = dep.artifact || dep.name.split(':')[1];
    return `https://central.sonatype.com/artifact/${group}/${artifact}/${dep.version}`;
  }

  getRegistryNamespace() {
    return 'maven';
  }

  fetchPackageAttestation(dep) {
    return null;
  }
}

module.exports = new MavenAdapter();
