const Promise = require('bluebird');
const path = require('path');
const { fs, util } = require('vortex-api');
const { runPatcher } = require('harmony-patcher');

const DATAPATH = path.join('Untitled_Data', 'Managed')
const ENTRY_POINT = 'GameManager::Awake';
const EPIC_APP_ID = 'Flour';

function requiresLauncher() {
  return util.GameStoreHelper.isGameInstalled(EPIC_APP_ID, 'epic')
    .then(launcherId => (!!launcherId)
      ? { launcher: launcherId, addInfo: EPIC_APP_ID }
      : undefined);
}

function findGame() {
  return util.GameStoreHelper.findByAppId(EPIC_APP_ID)
    .then(epicEntry => epicEntry.gamePath);
}

function modPath() {
  return path.join(DATAPATH, 'VortexMods');
}

function prepareForModding(discovery) {
  const absPath = path.join(discovery.path, DATAPATH);
  return runPatcher(__dirname, absPath, ENTRY_POINT, false)
    .then(() => fs.ensureDirWritableAsync(path.join(absPath, 'VortexMods'), () => Promise.resolve()));
}

function main(context) {
  context.registerGame({
    id: 'untitledgoosegame',
    name: 'Untitled Goose Game',
    mergeMods: true,
    queryPath: findGame,
    queryModPath: modPath,
    requiresLauncher,
    logo: 'gameart.jpg',
    executable: () => 'Untitled.exe',
    requiredFiles: [
      'Untitled.exe',
      'UnityPlayer.dll',
    ],
    setup: prepareForModding,
  });

  return true;
}

module.exports = {
  default: main,
};
