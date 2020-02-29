const path = require('path');
const { log, util } = require('vortex-api');

class DS2SotFS {
  constructor(context) {
    this.context = context;
    this.id = 'DS2SotFS';
    this.name = 'Dark Souls II SotFS';
    this.mergeMods = true;
    this.logo = 'gameart.jpg';
    this.details = {
      steamAppId: 335300,
    };
    this.requiredFiles = ['/DarkSoulsII.exe'];
  }

  queryPath() {
	return util.steam.findByAppId('335300')
      .then(game => {
        if (game.appid === '335300') {
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
    return '/DarkSoulsII.exe';
  }
}

function main(context) {
  context.registerGame(new DS2SotFS(context));

  return true;
}

module.exports = {
  default: main,
};
