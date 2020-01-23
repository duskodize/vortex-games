const Promise = require('bluebird');
const path = require('path');
const { fs, util } = require('vortex-api');
const { initHarmonyUI, runPatcher } = require('harmony-patcher');
const semver = require('semver');

const GAME_ID = 'pathfinderkingmaker';
const Name = 'Pathfinder:\tKingmaker';
const EXEC = 'Kingmaker.exe';
const SteamId = 640820;

const I18N_NAMESPACE = `game-${GAME_ID}`;
const DATAPATH = path.join('Kingmaker_Data', 'Managed');
const ENTRY_POINT = 'Kingmaker.GameStarter::Awake';

function queryModPath() {
  return 'Mods';
}

function findGame() {
  return util.GameStoreHelper.findByName('Kingmaker')
    .then(game => game.gamePath);
}

function hasModsInstalled(api) {
  const state = api.store.getState();
  const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return Object.keys(mods).length > 0;
}

function prepareForModding(discovery, context) {
  const api = context.api;
  const moddingPath = path.join(discovery.path, queryModPath());
  const absDataPath = path.join(discovery.path, DATAPATH);
  return new Promise((resolve) => (!hasModsInstalled(api))
    ? runPatcher(__dirname, absDataPath, ENTRY_POINT, false, moddingPath, context)
      .then(() => resolve())
    : resolve())
    .then(() => fs.ensureDirWritableAsync(path.join(discovery.path, queryModPath()), () => Promise.resolve()));
}

function migrate030(api, oldVersion) {
  if (semver.gte(oldVersion, '0.3.0')) {
    return Promise.resolve();
  }

  if (!hasModsInstalled(api)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    return api.sendNotification({
      id: 'pk-requires-upgrade',
      type: 'warning',
      message: api.translate('Vortex no longer requires UMM',
        { ns: I18N_NAMESPACE }),
      noDismiss: true,
      actions: [
        {
          title: 'Explain',
          action: () => {
            api.showDialog('info', 'Pathfinder: Kingmaker', {
              text: 'As part of our on-going quest to improve Vortex, we have developed '
                  + 'and integrated a Unity patcher/mod loader which will remove Vortex\'s '
                  + 'dependency on the UMM application. The integrated unity patcher is capable of '
                  + 'loading and executing existing/future UMM mods AND newly created Vortex patcher mods.\n'
                  + 'What this means for you as a user of this extension:\n\n'
                  + '1. Your mods and UMM installation are currently intact, and you may continue '
                  + 'playing Pathfinder through UMM as you have been so far - Vortex can still be used '
                  + 'to download and install Pathfinder mods inside UMM\'s mods folder; but keep in mind that '
                  + 'UMM cannot load/execute Vortex specific mods.\n\n'
                  + '2. You can find a new dropdown button on the Mods page which will give you '
                  + 'control over Vortex\'s Unity patcher. Please DO NOT use these buttons unless '
                  + 'the existing UMM patcher function has been uninstalled/removed!\n\n'
                  + '3. To uninstall/remove the UMM patcher function, please start-up the UMM tool '
                  + 'select Pathfinder: Kingmaker and click the uninstall button. (if it\'s greyed out, you\'re ' 
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

function registerActions(context) {
  const reportPatcherError = (err) => {
    context.api.showErrorNotification('Patcher encountered errors',
      'The patcher was unable to finish its operation "{{errorMsg}}"',
      { replace: { errorMsg: err } });
  };

  initHarmonyUI(context, __dirname, DATAPATH, ENTRY_POINT,
    queryModPath(), GAME_ID, reportPatcherError);
}

function main(context) {
  context.registerGame({
    id: GAME_ID,
    name: Name,
    logo: 'gameart.jpg',
    mergeMods: true,
    queryPath: findGame,
    queryModPath,
    executable: () => EXEC,
    requiredFiles: [ EXEC ],
    details:
    {
      steamAppId: SteamId,
    },
    setup: (discovery) => prepareForModding(discovery, context),
  });

  context.registerMigration(old => migrate030(context.api, old));
  registerActions(context);

  return true;
}

module.exports = {
    default: main
};
