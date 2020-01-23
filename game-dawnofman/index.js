const Promise = require('bluebird');
const path = require('path');
const { app, remote } = require('electron');
const { actions, fs, selectors, util } = require('vortex-api');
const { runPatcher } = require('harmony-patcher');
const semver = require('semver');

const uniApp = app || remote.app;

const GAME_ID = 'dawnofman';
const STEAM_ID = 858810;
const SCENE_FILE_EXT = '.scn.xml';
const UMM_MOD_INFO = 'Info.json';
const I18N_NAMESPACE = `game-${GAME_ID}`;
const DATAPATH = path.join('DawnOfMan_Data', 'Managed');
const ENTRY_POINT = 'DawnOfMan.TitleStateMain::init';

function getSceneFolder() {
  return path.join(uniApp.getPath('documents'), 'DawnOfMan', 'Scenarios');
}

function findGame() {
  return util.GameStoreHelper.findByName('Dawn of Man')
    .then(game => game.gamePath);
}

function modsPath() {
  return 'Mods';
}

function prepareForModding(discovery, api) {
  const moddingPath = path.join(discovery.path, modsPath());
  const absDataPath = path.join(discovery.path, DATAPATH);
  return new Promise((resolve) => (!hasModsInstalled(api))
    ? runPatcher(__dirname, absDataPath, ENTRY_POINT, false, moddingPath)
      .then(() => resolve())
    : resolve())
    .then(() => fs.ensureDirWritableAsync(getSceneFolder(), () => Promise.resolve()))
    .then(() => fs.ensureDirWritableAsync(path.join(discovery.path, modsPath()), () => Promise.resolve()));
}

function endsWithPattern(instructions, pattern) {
  return Promise.resolve(instructions.find(inst => inst.source.endsWith(pattern)) !== undefined);
}

function installSceneMod(files, destinationPath) {
  const sceneFile = files.find(file => file.endsWith(SCENE_FILE_EXT));
  const idx = sceneFile.indexOf(path.basename(sceneFile));
  const modName = path.basename(destinationPath, '.installing')
    .replace(/[^A-Za-z]/g, '');

  const filtered = files.filter(file => !file.endsWith(path.sep))
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(modName, file.substr(idx)),
    };
  })

  return Promise.resolve({ instructions });
}

function installMod(files, destinationPath) {
  // The scene file is expected to be at the root of scene mods.
  const infoFile = files.find(file => file.endsWith(UMM_MOD_INFO));
  const idx = infoFile.indexOf(UMM_MOD_INFO);
  const rootPath = path.dirname(infoFile);
  const modName = path.basename(destinationPath, '.installing')
    .replace(/[^A-Za-z]/g, '');

  const filtered = files.filter(file => (!file.endsWith(path.sep))
    && (file.indexOf(rootPath) !== -1));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(modName, file.substr(idx)),
    };
  });

  return Promise.resolve({ instructions });
}

function isSceneMod(files) {
  return files.find(file => file.endsWith(SCENE_FILE_EXT)) !== undefined;
}

function isUMMMod(files) {
  return files.find(file => file.endsWith(UMM_MOD_INFO)) !== undefined;
}

function testSceneMod(files, gameId) {
  return Promise.resolve({
    supported: ((gameId === GAME_ID) && (isSceneMod(files))),
    requiredFiles: []
  });
}

function testMod(files, gameId) {
  return Promise.resolve({
    supported: ((gameId === GAME_ID) && (isUMMMod(files))),
    requiredFiles: []
  });
}

function hasModsInstalled(api) {
  const state = api.store.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return Object.keys(mods).length > 0;
}

function migrate010(api, oldVersion) {
  if (semver.gte(oldVersion, '0.1.0')) {
    return Promise.resolve();
  }

  if (!hasModsInstalled(api)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    return api.sendNotification({
      id: 'dom-requires-upgrade',
      type: 'warning',
      message: api.translate('Vortex no longer requires UMM',
        { ns: I18N_NAMESPACE }),
      noDismiss: true,
      actions: [
        {
          title: 'Explain',
          action: () => {
            api.showDialog('info', 'Dawn of Man', {
              text: 'As part of our on-going quest to improve Vortex, we have developed '
                  + 'and integrated a Unity patcher/mod loader which will remove Vortex\'s '
                  + 'dependency on the UMM application. The integrated unity patcher is capable of '
                  + 'loading and executing existing/future UMM mods AND newly created Vortex patcher mods.\n'
                  + 'What this means for you as a user of this extension:\n\n'
                  + '1. Your mods and UMM installation are currently intact, and you may continue '
                  + 'playing DoM through UMM as you have been so far - Vortex can still be used '
                  + 'to download and install DoM mods inside UMM\'s mods folder; but keep in mind that '
                  + 'UMM cannot load/execute Vortex specific mods.\n\n'
                  + '2. You can find a new dropdown button on the Mods page which will give you '
                  + 'control over Vortex\'s Unity patcher. Please DO NOT use these buttons unless '
                  + 'the existing UMM patcher function has been uninstalled/removed!\n\n'
                  + '3. To uninstall/remove the UMM patcher function, please start-up the UMM tool '
                  + 'select Dawn of Man and click the uninstall button. (if it\'s greyed out, you\'re '
                  + 'good to go)\n\n'
                  + '4. Once you confirmed that the UMM patch has been removed - click on the "Patcher - Add" '
                  + 'button on the mods page and Vortex will inject its own patcher method\n\n'
                  + 'You\'re good to go.',
            }, [
              { label: 'Close' },
            ]);
          },
        },
        {
          title: 'Understood',
          action: dismiss => {
            dismiss();
            resolve();
          }
        }
      ],
    });
  });
}

function getDiscoveryPath(state) {
  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if ((discovery === undefined) || (discovery.path === undefined)) {
    log('error', 'dawnofman was not discovered');
    return undefined;
  }

  return discovery.path;
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: 'Dawn of Man',
    logo: 'gameart.jpg',
    mergeMods: true,
    queryPath: findGame,
    queryModPath: modsPath,
    executable: () => 'DawnOfMan.exe',
    requiredFiles: [],
    details: {
      steamAppId: STEAM_ID,
    },
    setup: (discovery) => prepareForModding(discovery, context.api),
  });

  context.registerModType('dom-scene-modtype', 25,
    (gameId) => gameId === GAME_ID, () => getSceneFolder(),
    (instructions) => endsWithPattern(instructions, SCENE_FILE_EXT));

  context.registerMigration(old => migrate010(context.api, old));
  context.registerInstaller('dom-scene-installer', 25, testSceneMod, installSceneMod);
  context.registerInstaller('dom-mod', 25, testMod, installMod);

  const isGameRunning = (state) => {
    return Object.keys(util.getSafe(state, ['session', 'base', 'toolsRunning'], {})).length > 0;
  }

  const gameIsRunningNotif = () => {
    context.api.sendNotification({
      type: 'info',
      message: 'Can\'t run harmony patcher while a tool/game is running',
      displayMS: 5000,
    });
  }

  const reportPatcherError = (err) => {
    context.api.showErrorNotification('Patcher encountered errors',
      'The patcher was unable to finish its operation "{{errorMsg}}"',
      { replace: { errorMsg: err } });
  };

  context.registerAction('mod-icons', 500, 'savegame', {}, 'Patcher - Remove', () => {
    const store = context.api.store;
    const state = store.getState();
    const gameMode = selectors.activeGameId(state);
    if (gameMode !== GAME_ID) {
      return false;
    }

    if (isGameRunning(state)) {
      gameIsRunningNotif();
      return true;
    }

    const discoveryPath = getDiscoveryPath(state);
    const moddingPath = path.join(discoveryPath, modsPath());
    const dataPath = path.join(discoveryPath, DATAPATH);
    runPatcher(__dirname, dataPath, ENTRY_POINT, true, moddingPath)
      .catch(err => reportPatcherError(err));
    return true;
  }, () => {
    const state = context.api.store.getState();
    const gameMode = selectors.activeGameId(state);
    return (gameMode === GAME_ID)
  });

  context.registerAction('mod-icons', 500, 'savegame', {}, 'Patcher - Add', () => {
    const store = context.api.store;
    const state = store.getState();
    const gameMode = selectors.activeGameId(state);
    if (gameMode !== GAME_ID) {
      return false;
    }

    if (isGameRunning(state)) {
      gameIsRunningNotif();
      return true;
    }

    const discoveryPath = getDiscoveryPath(state);
    const moddingPath = path.join(discoveryPath, modsPath());
    const dataPath = path.join(discoveryPath, DATAPATH);

    runPatcher(__dirname, dataPath, ENTRY_POINT, false, moddingPath)
      .catch(err => reportPatcherError(err));
    return true;
  }, () => {
    const state = context.api.store.getState();
    const gameMode = selectors.activeGameId(state);
    return (gameMode === GAME_ID)
  });
}

module.exports = {
  default: main
};
