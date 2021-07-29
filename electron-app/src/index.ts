/* eslint-disable no-console */
import {
  app,
  BrowserWindow,
  crashReporter,
  dialog,
  ipcMain,
  Menu,
  Tray,
} from 'electron';
import installExtension, { EMBER_INSPECTOR } from 'electron-devtools-installer';
import * as isDev from 'electron-is-dev';
import * as windowStateKeeper from 'electron-window-state';
import type {
  LoginData,
  SetupData,
  SyncConfig,
  SyncRule,
  SyncState,
} from 'mapgeo-sync-config';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { Worker } from 'worker_threads';
import { EventObject, Interpreter } from 'xstate';
import { AuthContext } from './auth/machine';
import { createService as createAuthService } from './auth/service';
import handleFileUrls from './handle-file-urls';
import logger from './logger';
import { register as registerMapgeoHandlers } from './mapgeo/handlers';
import MapgeoService from './mapgeo/service';
import Scheduler from './scheduler';
import { register as registerStoreHandlers } from './store/handlers';
import { store } from './store/store';
import { waitForState } from './utils/wait-for-state';
import { QueryActionResponse } from './workers/query-action';
import { handleSquirrelEvent } from './squirrel-startup';

const pkg = require('../package.json');

const emberAppDir = path.resolve(__dirname, '..', 'ember-dist');
const emberAppURL = pathToFileURL(
  path.join(emberAppDir, 'index.html')
).toString();
const version = pkg.version;

let scheduler: Scheduler;
let mainWindow: BrowserWindow;
let tray: Tray;
let queryWorker: Worker;
let mapgeoService: MapgeoService;
let authService: Interpreter<
  AuthContext,
  any,
  EventObject,
  {
    value: any;
    context: AuthContext;
  }
>;

// Prevent double startup in windows and create shortcut and handle some updates
if (handleSquirrelEvent(app, version)) app.quit();

// TODO: re-enable once code signing figured out
// try {
//   require('update-electron-app')();
// } catch (e) {
//   logger.error('Failed to start app updater. ', e);
// }

app.setAboutPanelOptions({
  applicationName: app.name,
  applicationVersion: version,
});

const isWindows = process.platform === 'win32';

// Login https://www.electronjs.org/docs/api/app#appsetloginitemsettingssettings-macos-windows
let loginItemSettings = {};

if (isWindows) {
  // TODO: re-enable once updater is enabled
  // const appFolder = path.dirname(process.execPath);
  // const updateExe = path.resolve(appFolder, '..', 'Update.exe');
  // const exeName = path.basename(process.execPath);
  // loginItemSettings = {
  //   path: updateExe,
  //   args: [
  //     '--processStart',
  //     `"${exeName}"`,
  //     '--process-start-args',
  //     `"--hidden"`,
  //   ],
  // };
}

app.setLoginItemSettings({
  openAtLogin: true,
  ...loginItemSettings,
});

registerMapgeoHandlers(ipcMain);
registerStoreHandlers(ipcMain);

function updateSyncState(rule: SyncRule, data: Omit<Partial<SyncState>, 'id'>) {
  const all = store.get('syncState') || [];
  let state = all.find((item) => item.ruleId === rule.id);

  if (!state) {
    state = {
      ruleId: rule.id,
      ...data,
    };

    all.push(state);
  } else {
    Object.assign(state, { ...data });
  }

  store.set('syncState', all);
  mainWindow?.webContents.send('syncStateUpdated', all);
  return state;
}

ipcMain.handle('selectSourceFile', async (event, sourceId: string) => {
  const sources = store.get('sources');
  const source = sources.find((source) => source.id === sourceId);

  if (source.sourceType === 'file') {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: source.folder,
      properties: ['openFile', 'openDirectory'],
    });

    return result.filePaths[0];
  }

  return [];
});

ipcMain.handle('startSyncRuleSchedule', async (event, rule: SyncRule) => {
  return scheduler.scheduleRule(rule);
});

ipcMain.handle('cancelSyncRuleSchedule', async (event, rule: SyncRule) => {
  scheduler.cancelScheduledRule(rule);
});

ipcMain.handle('getStoreValue', (event, key: string) => {
  return store.get(key);
});

ipcMain.handle('restoreAuth', async (event) => {
  if (authService.state.matches('authenticated')) {
    return true;
  }
  return false;
});

ipcMain.handle('login', async (event, data: LoginData) => {
  if (!mapgeoService) {
    throw new Error('MapGeoService has not been setup');
  }

  authService.send({ type: 'LOGIN', payload: data } as any);
  await waitForState(authService, ['authenticated']);
  return true;
});

async function initWorkers(config?: SyncConfig) {
  if (queryWorker) {
    await queryWorker.terminate();
  }

  queryWorker = new Worker(path.join(__dirname, 'workers', 'query-action.js'), {
    workerData: { config, mapgeo: store.get('mapgeo') },
  });
}

ipcMain.handle('checkMapgeo', async (event, data: SetupData) => {
  authService.send({ type: 'SETUP', payload: data } as any);
  return waitForState(authService, [
    'unauthenticated.withConfig.idle',
    'unauthenticated.withConfig.validated',
  ]);
});

ipcMain.handle('logout', async (event, data: SetupData) => {
  authService.send({ type: 'LOGOUT' });
  return waitForState(authService, ['unauthenticated.idle']);
});

function createBrowserWindow() {
  // Load the previous state with fallback to defaults
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 800,
  });

  // Create the window using the state information
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,

    webPreferences: {
      // So we can use electron-store on the client
      enableRemoteModule: true,
      // details https://github.com/electron/electron/issues/23506
      contextIsolation: false,
      // to use ipcRenderer and events from main process (here)
      nodeIntegration: true,
    },
  });

  // Registers listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  mainWindowState.manage(mainWindow);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // If you want to open up dev tools programmatically, call
  // mainWindow.openDevTools();

  // Load the ember application
  mainWindow.loadURL(emberAppURL);
  authService = createAuthService({
    send: (event: string, payload: unknown) =>
      mainWindow?.webContents?.send(event, payload),
    getMapgeoService: () => mapgeoService,
    setMapgeoService: (value) => (mapgeoService = value),
  });
  logger.log('starting auth service');
  logger.log(authService.start().state.value);

  // Ember app has loaded, send an event
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      logger.log('did-finish-load');

      if (!scheduler) {
        const logScope = logger.scope('scheduler');

        logScope.info('Setting up scheduler');

        scheduler = new Scheduler({
          store,
          updateSyncState,
          run: async (rule) => {
            logScope.log(`handle run of ${rule.name}`);
            const sources = store.get('sources') || [];
            const source = sources.find(
              (source) => source.id === rule.sourceId
            );

            queryWorker.postMessage({
              event: 'handle-rule',
              data: {
                rule,
                source,
              },
            });

            const result = await new Promise(
              (resolve: (msg: QueryActionResponse) => void, reject) => {
                queryWorker.once('message', (message: QueryActionResponse) => {
                  logScope.log('handle-rule result: ' + message);
                  resolve(message);
                });
              }
            );

            return result;
          },
        });
      }

      // create/start the service
      if (!authService) {
        logger.log('Setting up auth service');

        authService = createAuthService({
          send: (event: string, payload: unknown) =>
            mainWindow.webContents.send(event, payload),
          getMapgeoService: () => mapgeoService,
          setMapgeoService: (value) => (mapgeoService = value),
        });

        logger.log('starting auth service');
        logger.log(authService.start().state.value);
      }

      if (!queryWorker) {
        initWorkers();
      }

      ipcMain.on('runRule', async (event, rule: SyncRule) => {
        const sources = store.get('sources') || [];
        const source = sources.find((source) => source.id === rule.sourceId);

        queryWorker.postMessage({
          event: 'handle-rule',
          data: {
            rule,
            source,
          },
        });

        queryWorker.once('message', (message) => {
          // logger.log(message);
          event.reply('action-result', message);
        });
      });
    } catch (e) {
      logger.scope('did-finish-load').error(e);
      throw e;
    }
  });

  // If a loading operation goes wrong, we'll send Electron back to
  // Ember App entry point
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow?.loadURL(emberAppURL);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'killed') {
      logger.log(
        'Your Ember app (or other code) in the main window has crashed.'
      );
      logger.log(
        'This is a serious issue that needs to be handled and/or debugged.'
      );
    }
  });

  mainWindow.on('unresponsive', () => {
    logger.log(
      'Your Ember app (or other code) has made the window unresponsive.'
    );
  });

  mainWindow.on('responsive', () => {
    logger.log('The main window has become responsive again.');
  });

  mainWindow.on('closed', (e: Electron.IpcRendererEvent) => {
    e.preventDefault();
    mainWindow = null;

    // Stop the auth service
    if (authService) {
      logger.log('window closed, stopping auth service');
      authService.stop();
      authService = undefined;
    }
  });

  return mainWindow;
}

// For more information, see http://electron.atom.io/docs/api/crash-reporter/
crashReporter.start({
  productName: app.name,
  companyName: 'AppGeo',
  // submitURL: 'https://your-domain.com/url-to-submit',
  uploadToServer: false,
});

logger.log('crash path', app.getPath('crashDumps'));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.log('closing because windows closed');
    app.quit();
    tray?.destroy();
  }
});

app.on('ready', async () => {
  if (isDev) {
    try {
      await installExtension(EMBER_INSPECTOR, {
        loadExtensionOptions: { allowFileAccess: true },
      });
    } catch (err) {
      logger.log('Failed to install Ember Inspector: ', err);
    }
  }

  tray = new Tray(path.join(__dirname, '..', 'resources/icon-16.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Preferences',
      type: 'normal',
      click: () => {
        if (!mainWindow) {
          mainWindow = createBrowserWindow();
        } else {
          mainWindow.show();
        }
      },
    },
    { label: 'About', type: 'normal', click: () => app.showAboutPanel() },
    {
      type: 'separator',
    },
    {
      label: 'Quit',
      type: 'normal',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('MapGeo Sync');
  tray.setContextMenu(contextMenu);

  await handleFileUrls(emberAppDir);

  mainWindow = createBrowserWindow();
});

// Handle an unhandled error in the main thread
//
// Note that 'uncaughtException' is a crude mechanism for exception handling intended to
// be used only as a last resort. The event should not be used as an equivalent to
// "On Error Resume Next". Unhandled exceptions inherently mean that an application is in
// an undefined state. Attempting to resume application code without properly recovering
// from the exception can cause additional unforeseen and unpredictable issues.
//
// Attempting to resume normally after an uncaught exception can be similar to pulling out
// of the power cord when upgrading a computer -- nine out of ten times nothing happens -
// but the 10th time, the system becomes corrupted.
//
// The correct use of 'uncaughtException' is to perform synchronous cleanup of allocated
// resources (e.g. file descriptors, handles, etc) before shutting down the process. It is
// not safe to resume normal operation after 'uncaughtException'.
process.on('uncaughtException', (err) => {
  logger.log('An exception in the main thread was not handled.');
  logger.log(
    'This is a serious issue that needs to be handled and/or debugged.'
  );
  logger.log(`Exception: ${err}`);
  logger.log(err.stack);
});
