const path = require('path');
const { log, util } = require('vortex-api');

class DarkSoulsRemastered {
  constructor(context) {
    this.context = context;
    this.id = 'darksoulsremastered';
    this.name = 'Dark Souls Remastered';
    this.mergeMods = true;
    this.logo = 'gameart.jpg';
    this.details = {
      steamAppId: 570940,
    };
    this.requiredFiles = ['/DarkSoulsRemastered.exe'];
  }

  queryPath() {
	return util.steam.findByAppId('570940')
      .then(game => {
        if (game.appid === '570940') {
          this.details = {
            steamAppId: game.appid,
          };
        }
        return game.gamePath;
      });
  }

  queryModPath() {
    return '.';
  }

  executable() {
    return '/DarkSoulsRemastered.exe';
  }
}

function main(context) {
  context.registerGame(new DarkSoulsRemastered(context));

  return true;
}

module.exports = {
  default: main,
};
