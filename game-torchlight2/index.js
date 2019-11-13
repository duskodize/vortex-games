const path = require('path');
const { app, remote } = require('electron');
const winapi = require('winapi-bindings');
const { fs, util } = require('vortex-api');

const appUni = app || remote.app;

// Nexus Mods id for the game.
const GAME_ID = 'torchlight2';

const STEAM_ID = '200710';

const MOD_EXT = '.mod';

function modPath() {
  return path.join(appUni.getPath('documents'), 'My Games', 'runic games', 'torchlight 2', 'mods');
}

function findGame() {
  try {
    const instPath = winapi.RegGetValue('HKEY_LOCAL_MACHINE',
      'SOFTWARE\\WOW6432Node\\runic games\\torchlight ii',
      'instdir');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return util.GameStoreHelper.findByAppId(STEAM_ID.toString())
      .then(game => game.gamePath);
  }
}

function prepareForModding(discovery) {
  return fs.ensureDirWritableAsync(modPath(),
    () => Promise.resolve());
}

function installContent(files,
                        destinationPath,
                        gameId,
                        progressDelegate) {
  // Torchlight 2 expects .MOD files to be dropped inside the mods folder inside
  //  their own folder. Reason why we're going to ignore all other files and only
  //  pull the .mod files.
  const modFiles = files.filter(file => path.extname(file).toLowerCase() === MOD_EXT);

  const instructions = modFiles.map(file => {
    // We're going to name the mod directory same as the .mod file.
    //  We already know that his is a .mod file, but we're unsure
    //  about casing (.mod or .MOD both of which apparently are supported)
    //  reason why we're going to retrieve the extension name from the file
    //  directly before we create the mod folder.
    const fileExt = path.extname(file);
    const modName = path.basename(file, fileExt);
    return {
      type: 'copy',
      source: file,
      destination: path.join(modName, path.basename(file)),
    };
  });

  return Promise.resolve({ instructions });
}

function testSupportedContent(files, gameId) {
  // Make sure we're able to support this mod.
  const supported = (gameId === GAME_ID) &&
    (files.find(file => path.extname(file).toLowerCase() === MOD_EXT) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function requiresLauncher(gamePath) {
  return fs.statAsync(path.join(gamePath, 'steam_api.dll'))
    .then(() => Promise.resolve({ launcher: 'steamstorelauncher', addInfo: STEAM_ID }))
    .catch(err => Promise.resolve(undefined));
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: 'Torchlight II',
    mergeMods: true,
    requiresLauncher,
    queryPath: findGame,
    queryModPath: modPath,
    logo: 'gameart.jpg',
    executable: () => 'ModLauncher.exe',
    requiredFiles: [
      'Torchlight2.exe',
      'ModLauncher.exe',
    ],
    setup: prepareForModding,
    details: {
      steamAppId: STEAM_ID,
    },
  });

  context.registerInstaller('torchlight2-mod', 25, testSupportedContent, installContent);

  return true;
}

module.exports = {
  default: main,
};
