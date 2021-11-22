import {
  app,
  BrowserWindow,
  crashReporter,
  dialog,
  ipcMain,
  IpcMainEvent,
  Menu,
  shell,
  Tray,
} from 'electron';
import installExtension, { EMBER_INSPECTOR } from 'electron-devtools-installer';
import * as isDev from 'electron-is-dev';
import * as windowStateKeeper from 'electron-window-state';
import { MenuItemConstructorOptions } from 'electron/main';
import type {
  LoginData,
  SetupData,
  Source,
  SyncFileConfig,
  SyncRule,
  SyncState,
} from 'mapgeo-sync-config';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { v4 } from 'uuid';
import { EventObject, Interpreter } from 'xstate';
import { AuthContext } from './auth/machine';
import { createService as createAuthService } from './auth/service';
import { createBgRenderer } from './bg-renderer';
import handleFileUrls from './handle-file-urls';
import logger from './logger';
import { register as registerMapgeoHandlers } from './mapgeo/handlers';
import MapgeoService from './mapgeo/service';
import {
  ErrorResponse,
  FinishedResponse,
  QueryActionResponse,
} from './process-rule';
import Scheduler from './scheduler';
import { test } from './source-handlers/database';
import { handleSquirrelEvent } from './squirrel-startup';
import { register as registerStoreHandlers } from './store/handlers';
import { store } from './store/store';
import flatState from './utils/log-state';
import wrapRule from './utils/wrap-rule';

const pkg = require('../package.json');

const emberAppDir = path.resolve(__dirname, '..', 'ember-dist');
const emberAppURL = pathToFileURL(
  path.join(emberAppDir, 'index.html')
).toString();
const version = pkg.version;

let scheduler: Scheduler;
let mainWindow: BrowserWindow;
let bgWindow: BrowserWindow;
let tray: Tray;
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

if (!scheduler) {
  const logScope = logger.scope('scheduler');

  logScope.info('Setting up scheduler');

  scheduler = new Scheduler({
    store,
    updateSyncState,
    run: async (rule, nextScheduledRun) => {
      const runId = v4();
      const startedAt = new Date();
      const ruleBundle = wrapRule(rule);

      updateSyncState(rule, {
        running: true,
      });

      bgWindow.webContents.send('handle-rule', {
        runId,
        ruleBundle,
        mapgeo: store.get('mapgeo'),
      });

      const result = await new Promise(
        (resolve: (msg: QueryActionResponse) => void, reject) => {
          const handleMessage = (
            event: IpcMainEvent,
            message: QueryActionResponse
          ) => {
            if (message.rule.id === rule.id && message.runId === runId) {
              ipcMain.off('rule-handled', handleMessage);
              logScope.log('handle-rule result: ' + message);
              resolve(message);
            }
          };

          ipcMain.on('rule-handled', handleMessage);
        }
      );

      updateRuleStateAfterRun(rule, result, runId, {
        startedAt,
        wasScheduled: true,
        otherState: { nextScheduledRun },
      });

      return result;
    },
  });
}

authService = createAuthService({
  send: (event: string, payload: unknown) =>
    mainWindow?.webContents?.send(event, payload),
  getMapgeoService: () => mapgeoService,
  setMapgeoService: (value) => (mapgeoService = value),
});

logger.log('starting auth service');

authService.start();
logger.log('initial state: ', flatState(authService));

ipcMain.on('bg-ready', (event, arg) => {
  logger.info('bg-ready');
});

ipcMain.handle('testConnection', async (event, source: Source) => {
  try {
    return await test(source);
  } catch (e) {
    return e;
  }
});

ipcMain.handle('selectSourceBaseFolder', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: os.homedir(),
    properties: ['openDirectory'],
  });

  return result.filePaths[0];
});

ipcMain.handle(
  'selectSourceFile',
  async (event, sourceId: string, fileType: SyncFileConfig['fileType']) => {
    const sources = store.get('sources');
    const source = sources.find((source) => source.id === sourceId);

    if (source.sourceType === 'file') {
      const result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: source.folder,
        properties: ['openFile'],
        filters: [{ name: 'Default', extensions: [fileType] }],
      });

      return result.filePaths[0];
    }

    return [];
  }
);

ipcMain.handle('selectSourceFolder', async (event, sourceId: string) => {
  const sources = store.get('sources');
  const source = sources.find((source) => source.id === sourceId);

  if (source.sourceType === 'file') {
    const result = await dialog.showOpenDialog(mainWindow, {
      defaultPath: source.folder,
      properties: ['openDirectory'],
    });

    return result.filePaths[0];
  }

  return [];
});

ipcMain.handle('loadClient', async (event) => {
  return new Promise((resolve) => {
    mainWindow.webContents.once('did-finish-load', () => {
      resolve({
        isAuthenticated: !!mapgeoService?.token,
        host: mapgeoService?.host,
        config: store.get('mapgeo.config'),
      });
    });
  });
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

ipcMain.handle('login', async (event, data: LoginData) => {
  if (!mapgeoService) {
    throw new Error('MapGeoService has not been setup');
  }

  authService.send({ type: 'LOGIN', payload: data } as any);

  return true;
});

ipcMain.handle('checkMapgeo', async (event, data: SetupData) => {
  const promise = new Promise((resolve) => {
    store.onDidChange('mapgeo.config' as any, (config) => {
      resolve({ config, host: store.get('mapgeo.host') });
    });
  });

  authService.send({ type: 'SETUP', payload: data } as any);

  return promise;
});

ipcMain.handle('logout', async (event, data: SetupData) => {
  authService.send({ type: 'LOGOUT' });
  return true;
});

ipcMain.handle('reset', async (event, data: SetupData) => {
  authService.send({ type: 'RESET' });
  return true;
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

  const hash = store.get('mapgeo.login')
    ? ''
    : store.get('mapgeo.host')
    ? '#/login'
    : '#/setup';
  // Load the ember application
  mainWindow.loadURL(`${emberAppURL}${hash}`);

  // Ember app has loaded, send an event
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      logger.log('did-finish-load');

      ipcMain.on('runRule', async (runEvent, rule: SyncRule, runId: string) => {
        const ruleBundle = wrapRule(rule);
        const startedAt = new Date();

        updateSyncState(rule, {
          running: true,
        });

        bgWindow.webContents.send('handle-rule', {
          ruleBundle,
          runId,
          mapgeo: store.get('mapgeo'),
        });

        const handleMessage = (
          event: IpcMainEvent,
          message: QueryActionResponse
        ) => {
          if (message.rule.id === rule.id && message.runId === runId) {
            ipcMain.off('rule-handled', handleMessage);
            // logger.log(message);
            runEvent.reply('action-result', message);
            updateRuleStateAfterRun(rule, message, runId, { startedAt });
          }
        };

        ipcMain.on('rule-handled', handleMessage);
      });
    } catch (e) {
      logger.scope('did-finish-load').error(e);
      throw e;
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(function (details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
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
    // if (authService) {
    //   logger.log('window closed, stopping auth service');
    //   authService.stop();
    // }
  });

  return mainWindow;
}

// For more information, see http://electron.atom.io/docs/api/crash-reporter/
// TODO: setup a crash reporting server? Or maybe use gcp?
crashReporter.start({
  productName: app.name,
  companyName: 'AppGeo',
  // submitURL: 'https://your-domain.com/url-to-submit',
  uploadToServer: false,
});

logger.log('crash path', app.getPath('crashDumps'));
logger.log('log path', app.getPath('userData'));

// Increase max memory
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logger.log('closing because windows closed');
    bgWindow?.close();
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

  tray = new Tray(path.join(__dirname, '..', 'resources/iconTemplate.png'));
  const menuItems: any[] = [
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
  ];

  const debuggingMenus = [
    {
      label: 'Open Config',
      click: () => {
        shell.openPath(store.path);
      },
    },
    {
      label: 'Open Logs',
      click: () => {
        // Copied path from https://github.com/megahertz/electron-log/issues/270#issuecomment-898495244
        shell.openPath(logger.transports.file.getFile().path);
      },
    },
    {
      label: 'Open Crash Report',
      click: () => {
        shell.openPath(app.getPath('crashDumps'));
      },
    },
    {
      label: 'Open Main DevTools',
      click: () => {
        mainWindow?.webContents.openDevTools();
      },
    },
    {
      label: 'Toggle BG Window',
      click: () => {
        if (bgWindow.isVisible()) {
          bgWindow.hide();
        } else {
          bgWindow.show();
        }
      },
    },
  ];

  menuItems.push({
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:',
      },
    ],
  });

  menuItems.push({
    label: 'Debugging',
    submenu: debuggingMenus,
  });

  const contextMenu = Menu.buildFromTemplate([
    ...menuItems,
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

  Menu.setApplicationMenu(contextMenu);

  await handleFileUrls(emberAppDir);

  mainWindow = createBrowserWindow();
  bgWindow = createBgRenderer();
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

function updateRuleStateAfterRun(
  rule: SyncRule,
  result: FinishedResponse | ErrorResponse,
  runId: string,
  {
    startedAt,
    wasScheduled,
    otherState,
  }: {
    startedAt?: Date;
    wasScheduled?: boolean;
    otherState?: Partial<SyncState>;
  } = {}
) {
  const all = store.get('syncState') || [];
  const state = all.find((item) => item.ruleId === rule.id);
  const logs = state.logs || [];
  const runMode = wasScheduled ? 'scheduled' : 'manual';

  if (!logs.find((log) => log.runId === runId)) {
    if ('status' in result) {
      logs.unshift({
        ok: !!result.status.ok,
        runMode,
        runId,
        numItems: result.numItems,
        errors: result.status.messages,
        intersection: result.status.intersection,
        startedAt,
        endedAt: new Date(),
      });
    } else {
      logs.unshift({
        ok: result.errors === undefined || result.errors.length === 0,
        runMode,
        runId,
        numItems: result.numItems,
        errors: result.errors.map((err) => ({
          type: 'error',
          message: err.message,
        })),
        startedAt,
        endedAt: new Date(),
      });
    }

    updateSyncState(rule, {
      running: false,
      ...otherState,
      logs: logs.slice(0, 5),
    });
  }
}
