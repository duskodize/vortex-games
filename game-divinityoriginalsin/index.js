const { app, remote } = require('electron');
const path = require('path');
const { selectors, util } = require('vortex-api');
const winapi = require('winapi-bindings');

const GAME_ID = 'divinityoriginalsin';
const GAME_ID_EE = 'divinityoriginalsinenhancededition';

const appUni = app || remote.app;

function modPath() {
  return '.';
}

function modPathEE() {
  return '.';
}

function findGame() {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1445516929',
      'path');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return util.steam.findByName('Divinity: Original Sin')
      .then(game => game.gamePath);
  }
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: 'Divinity: Original Sin \tClassic Edition',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: modPath,
    logo: 'gameart.jpg',
    executable: () => 'Shipping/EoCApp.exe',
    requiredFiles: [
      'Shipping/EoCApp.exe',
    ],
    environment: {
      SteamAPPId: '230230',
    },
    details: {
      steamAppId: 230230,
    }
  });

  context.registerGame({
    id: GAME_ID_EE,
    name: 'Divinity: Original Sin \tEnhanced Edition',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: modPathEE,
    logo: 'gameartEE.jpg',
    executable: () => 'Shipping/EoCApp.exe',
    requiredFiles: [
      'Shipping/EoCApp.exe',
    ],
    environment: {
      SteamAPPId: '373420',
    },
    details: {
      steamAppId: 373420,
    }
  });
  
  return true;
}

module.exports = {
  default: main
};
