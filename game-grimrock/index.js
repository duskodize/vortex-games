const { remote } = require('electron');
const { fs, log, util } = require('vortex-api');
const path = require('path');

function findGame() {
  return util.GameStoreHelper.findByName('Legend of Grimrock')
      .then(game => game.gamePath);
}

function modPath() {
  return path.join(remote.app.getPath('documents'), 'Almost Human', 'Legend of Grimrock', 'Dungeons');
}

function prepareForModding() {
  return fs.ensureDirAsync(modPath());
}

function main(context) {
  context.registerGame({
    id: 'grimrock',
    name: 'Legend of Grimrock',
    mergeMods: true,
    queryPath: findGame,
    queryModPath: modPath,
    logo: 'gameart.jpg',
    executable: () => 'grimrock.exe',
    requiredFiles: [
      'grimrock.exe',
    ],
    setup: prepareForModding,
    details: {
      steamAppId: 207170,
    },
  });

  return true;
}

module.exports = {
  default: main,
};
