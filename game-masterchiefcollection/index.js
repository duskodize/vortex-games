const { app, remote } = require('electron');
const path = require('path');
const Promise = require('bluebird');
const { parseXmlString } = require('libxmljs');
const { fs, log, util } = require('vortex-api');

const appUni = app || remote.app;
const MCC_LOCAL_LOW = path.resolve(appUni.getPath('appData'), '..', 'LocalLow', 'MCC');
const REPORT_PATH = path.join(MCC_LOCAL_LOW, 'Temporary');
const REPORT_PATTERN = /campaigncarnagereport.*.xml/;

// Nexus Mods id for the game.
const MS_APPID = 'Microsoft.Chelan';
const STEAM_ID = '976730';

// Each Halo game has its own internal
//  gameId which it uses to differentiate
//  between the games.
const INTERNAL_GAME_IDS = {
  HALO1: '1',
  HALO2: '2',
  HALO3: '3',
  ODST: '4',
  ANOTHER_HALO_GAME: '5',
  REACH: '6',
};

// Master chef collection
class MasterChiefCollectionGame {
  constructor(context, appId, name, modsFolder, internalId) {
    this.context = context;
    this.id = appId;
    this.internalId = internalId;
    this.name = `Master Chief Collection:\t${name}`;
    this.modsFolder = modsFolder;
    this.logo = 'gameart.jpg';
    this.requiredFiles = [];
    this.details = {
      steamAppId: STEAM_ID.toString()
    };
    this.mergeMods = true;
    this.fullModsPath = undefined;
  }

  queryModPath() {
    return this.fullModsPath;
  }

  executable() {
    return 'mcclauncher.exe';
  }

  async setup(discovery) {
    const runGameNotif = () => {
      this.context.api.showErrorNotification('Unable to resolve Xbox user ID',
        'Please run the game at least once before modding it.',
      { allowReport: false });
    };
    return fs.readdirAsync(REPORT_PATH).then(entries => {
      const reports = entries.filter(entry => entry.match(REPORT_PATTERN));
      return Promise.each(reports, report => (!!this.fullModsPath)
        ? Promise.resolve()
        : getXboxId(this.internalId, path.join(REPORT_PATH, report), 'utf-8')
            .catch(util.DataInvalid, err => Promise.resolve())
            .then(xboxId => {
              this.fullModsPath = path.join(MCC_LOCAL_LOW, 'LocalFiles', xboxId, this.modsFolder);
              return fs.ensureDirWritableAsync(this.fullModsPath, () => Promise.resolve());
        }))
        .catch(err => {
          runGameNotif();
          return Promise.reject(new Error('Unable to resolve mods path'));
        })
    })
  }
  
  queryPath() {
    return util.GameStoreHelper.findByAppId([MS_APPID, STEAM_ID])
      .then(game => game.gamePath);
  }

  requiresLauncher(gamePath) {
    return gamePath.startsWith('C:\\Program Files\\WindowsApps')
      ? Promise.resolve({ launcher: 'xbox', appInfo: MS_APPID })
      : Promise.resolve(undefined);
  }
}

function getXboxId(internalId, filePath, encoding) {
  return fs.readFileAsync(filePath, { encoding })
    .then(fileData => {
      let xmlDoc;
      try {
        xmlDoc = parseXmlString(fileData);
      } catch (err) {
        return Promise.reject(err);
      }

      const generalData = xmlDoc.find('//CampaignCarnageReport/GeneralData');
      if (generalData[0].attr('GameId').value() === internalId) {
        const players = xmlDoc.find('//CampaignCarnageReport/Players/PlayerInfo');
        const mainPlayer = players.find(player => player.attr('isGuest').value() === 'false');
        const xboxId = mainPlayer.attr('mXboxUserId').value();
        // The userId is prefixed with "0x" which is not needed.
        return Promise.resolve(xboxId.substring(2));
      } else {
        return Promise.reject(new util.DataInvalid('Wrong internal gameId'));
      }
    });
}

module.exports = {
  default: context => {
    context.registerGame(new MasterChiefCollectionGame(context, 
      'halothemasterchiefcollection',
      'REACH',
      'HaloReach',
      INTERNAL_GAME_IDS.REACH));
  }
};
