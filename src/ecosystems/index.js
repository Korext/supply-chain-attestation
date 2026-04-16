const npm = require('./npm');
const pypi = require('./pypi');
const cargo = require('./cargo');
const go = require('./go');
const rubygems = require('./rubygems');
const maven = require('./maven');
const nuget = require('./nuget');
const composer = require('./composer');
const swift = require('./swift');
const cocoapods = require('./cocoapods');
const pub = require('./pub');
const hex = require('./hex');
const cpan = require('./cpan');
const conda = require('./conda');

module.exports = {
  npm,
  pypi,
  cargo,
  go,
  rubygems,
  maven,
  nuget,
  composer,
  swift,
  cocoapods,
  pub,
  hex,
  cpan,
  conda,

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
