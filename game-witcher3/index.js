const Promise = require('bluebird');
const path = require('path');
const winapi = require('winapi-bindings');
const { fs, util } = require('vortex-api');

function findGame() {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'Software\\CD Project Red\\The Witcher 3',
      'InstallFolder');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return util.GameStoreHelper.findByName('The Witcher 3: Wild Hunt')
      .catch(() => util.GameStoreHelper.findByAppId('499450'))
      .then(game => game.gamePath);
  }
}

function testSupportedTL(files, gameId) {
  const supported = (gameId === 'witcher3')
    && (files.find(file =>
      file.toLowerCase().split(path.sep).indexOf('mods') !== -1) !== undefined);
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installTL(files,
                   destinationPath,
                   gameId,
                   progressDelegate) {
  let prefix = files.reduce((prev, file) => {
    const components = file.toLowerCase().split(path.sep);
    const idx = components.indexOf('mods');
    if ((idx > 0) && ((prev === undefined) || (idx < prev.length))) {
      return components.slice(0, idx);
    } else {
      return prev;
    }
  }, undefined);

  if (prefix === undefined) {
    prefix = '';
  } else {
    prefix = prefix.join(path.sep) + path.sep;
  }

  const instructions = files
    .filter(file => !file.endsWith(path.sep) && file.toLowerCase().startsWith(prefix))
    .map(file => ({
      type: 'copy',
      source: file,
      destination: file.slice(prefix.length),
    }));

  return Promise.resolve({ instructions });
}

function testSupportedContent(files, gameId) {
  const supported = (gameId === 'witcher3')
    && (files.find(file => file.toLowerCase().startsWith('content' + path.sep) !== undefined));
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

function installContent(files,
                        destinationPath,
                        gameId,
                        progressDelegate) {
  return Promise.resolve(files
    .filter(file => file.toLowerCase().startsWith('content' + path.sep))
    .map(file => {
      const fileBase = file.split(path.sep).slice(1).join(path.sep);
      return {
        type: 'copy',
        source: file,
        destination: path.join('mod' + destinationPath, fileBase)
      };
  }));
}

function testTL(instructions) {
  return Promise.resolve(instructions.find(
    instruction => !!instruction.destination && instruction.destination.toLowerCase().startsWith('mods' + path.sep)
  ) !== undefined);
}

function testDLC(instructions) {
  return Promise.resolve(instructions.find(
    instruction => !!instruction.destination && instruction.destination.toLowerCase().startsWith('dlc' + path.sep)) !== undefined);
}

function prepareForModding(discovery) {
  return fs.ensureDirAsync(path.join(discovery.path, 'Mods'));
}

function main(context) {
  context.registerGame({
    id: 'witcher3',
    name: 'The Witcher 3',
    mergeMods: true,
    queryPath: findGame,
    supportedTools: [],
    queryModPath: () => 'Mods',
    logo: 'gameart.jpg',
    executable: () => 'bin/x64/witcher3.exe',
    setup: prepareForModding,
    requiredFiles: [
      'bin/x64/witcher3.exe',
    ],
    details: {
      steamAppId: 292030,
    }
  });

  const getDLCPath = (game) => {
    const state = context.api.store.getState();
    const discovery = state.settings.gameMode.discovered[game.id];
    return path.join(discovery.path, 'DLC');
  };

  const getTLPath = (game) => {
    const state = context.api.store.getState();
    const discovery = state.settings.gameMode.discovered[game.id];
    return discovery.path;
  };

  context.registerInstaller('witcher3tl', 25, testSupportedTL, installTL);
  context.registerInstaller('witcher3content', 50, testSupportedContent, installContent);
  context.registerModType('witcher3tl', 25, gameId => gameId === 'witcher3', getTLPath, testTL);
  context.registerModType('witcher3dlc', 25, gameId => gameId === 'witcher3', getDLCPath, testDLC);

  return true;
}

module.exports = {
  default: main,
};
