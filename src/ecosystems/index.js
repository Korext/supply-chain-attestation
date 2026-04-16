const npm = require('./npm');
const pypi = require('./pypi');
const cargo = require('./cargo');
const go = require('./go');
const rubygems = require('./rubygems');
const maven = require('./maven');
const nuget = require('./nuget');
const composer = require('./composer');

module.exports = {
  npm,
  pypi,
  cargo,
  go,
  rubygems,
  maven,
  nuget,
  composer,

  detectAll(projectPath) {
    const detected = [];
    for (const [name, adapter] of Object.entries(this)) {
      if (name !== 'detectAll' && adapter.detect(projectPath)) {
        detected.push(adapter);
      }
    }
    return detected;
  }
};
