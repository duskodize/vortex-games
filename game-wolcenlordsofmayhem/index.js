const path = require('path');
const { log, util } = require('vortex-api');

const EXEC_PATH = path.join('win_x64', 'Wolcen.exe');

class WolcenLordsofMayhem {
  constructor(context) {
    this.context = context;
    this.id = 'wolcenlordsofmayhem';
     this.name = 'Wolcen: Lords of Mayhem';
    this.mergeMods = true;
    this.logo = 'gameart.jpg';
    this.details = {
      steamAppId: 424370,
    };
    this.requiredFiles = [EXEC_PATH];
  }

  queryPath() {
	return util.steam.findByAppId('424370')
      .then(game => {
        if (game.appid === '424370') {
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
    return EXEC_PATH;
  }
}

function main(context) {
  context.registerGame(new WolcenLordsofMayhem(context));

  return true;
}

module.exports = {
  default: main,
};
