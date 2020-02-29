const path = require('path');
const { log, util } = require('vortex-api');

const EXEC_PATH = path.join('Game', 'DarkSoulsIII.exe');

class DarkSouls3 {
  constructor(context) {
    this.context = context;
    this.id = 'darksouls3';
    this.name = 'Dark Souls III';
    this.mergeMods = true;
    this.logo = 'gameart.jpg';
    this.details = {
      steamAppId: 374320,
    };
    this.requiredFiles = [EXEC_PATH];
  }

  queryPath() {
	return util.steam.findByAppId(['374320','94174'])
      .then(game => {
        if (game.appid === '374320') {
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
    return EXEC_PATH;;
  }
}

function main(context) {
  context.registerGame(new DarkSouls3(context));

  return true;
}

module.exports = {
  default: main,
};
