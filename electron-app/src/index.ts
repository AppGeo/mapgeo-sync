/* eslint-disable no-console */
// import installExtension, { EMBER_INSPECTOR } from 'electron-devtools-installer';
import { pathToFileURL } from 'url';
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  dialog,
  Notification,
} from 'electron';
import { Worker } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as windowStateKeeper from 'electron-window-state';
import handleFileUrls from './handle-file-urls';
import type {
  LoginData,
  QueryAction,
  SetupData,
  Source,
  SyncConfig,
  SyncRule,
  SyncState,
} from 'mapgeo-sync-config';
import Scheduler from './scheduler';
import MapgeoService from './mapgeo/service';
import { EventObject, Interpreter } from 'xstate';
import { AuthContext } from './auth/machine';
import { store } from './store';
import { register as registerMapgeoHandlers } from './mapgeo/handlers';
import { waitForState } from './utils/wait-for-state';
import { createService as createAuthService } from './auth/service';
import { RecurrenceRule, Range } from 'node-schedule';

const emberAppDir = path.resolve(__dirname, '..', 'ember-dist');
const emberAppURL = pathToFileURL(
  path.join(emberAppDir, 'index.html')
).toString();

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

registerMapgeoHandlers(ipcMain);

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
}

ipcMain.handle('store/findSyncRules', (event) => {
  return store.get('syncRules') || [];
});

ipcMain.handle('store/addSyncRule', (event, rule: SyncRule) => {
  let rules = store.get('syncRules');
  if (!rules) {
    rules = [];
  }
  rules.push(rule);
  store.set('syncRules', rules);
  return rules;
});

ipcMain.handle('store/removeSyncRule', (event, rule: SyncRule) => {
  let rules = store.get('syncRules');
  if (!rules) {
    return [];
  }
  rules = rules.filter((item) => item.id !== rule.id);
  store.set('syncRules', rules);
  return rules;
});

ipcMain.handle('store/findSyncState', (event) => {
  return store.get('syncState') || [];
});

ipcMain.handle('store/findSources', (event) => {
  return store.get('sources') || [];
});

ipcMain.handle('store/addSource', (event, source: Source) => {
  let sources = store.get('sources');
  if (!sources) {
    sources = [];
  }
  sources.push(source);
  store.set('sources', sources);
  return sources;
});

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
  const scheduleRule = new RecurrenceRule();
  const randomQuarter = Math.floor(Math.random() * 4) + 1;
  const minutes = randomQuarter * 15;

  if (rule.schedule?.frequency === 'daily') {
    scheduleRule.dayOfWeek = [new Range(0, 6)];
    scheduleRule.hour = rule.schedule?.hour;
    scheduleRule.minute = randomQuarter === 4 ? minutes - 5 : minutes;
  }

  scheduler.schedule(scheduleRule, (done) => {
    const sources = store.get('sources');
    const source = sources.find((source) => source.id === rule.sourceId);

    queryWorker.postMessage({
      event: 'handle-rule',
      data: {
        rule,
        source,
      },
    });
  });

  updateSyncState(rule, {
    scheduled: true,
    nextScheduledRun: scheduler.nextRunDate,
  });

  return { nextRunDate: scheduler.nextRunDate };
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

  // const isAuthenticated = await mapgeoService.login(data.email, data.password);

  // if (isAuthenticated) {
  //   store.set('mapgeo.login', data);
  // }

  authService.send({ type: 'LOGIN', payload: data } as any);
  await waitForState(authService, ['authenticated']);
  return true;
});

async function initWorkers(config: SyncConfig) {
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
      mainWindow.webContents.send(event, payload),
    getMapgeoService: () => mapgeoService,
    setMapgeoService: (value) => (mapgeoService = value),
  });
  console.log('starting auth service');
  console.log(authService.start().state.value);

  // Ember app has loaded, send an event
  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('did-finish-load');
    if (!scheduler) {
      scheduler = new Scheduler({
        store,
        updateSyncState,
        run: async (rule) => {
          console.log(`handle run of ${rule.name}`);
        },
      });
    }

    // create/tart the service
    if (!authService) {
      authService = createAuthService({
        send: (event: string, payload: unknown) =>
          mainWindow.webContents.send(event, payload),
        getMapgeoService: () => mapgeoService,
        setMapgeoService: (value) => (mapgeoService = value),
      });
      console.log('starting auth service');
      console.log(authService.start().state.value);
    }

    let currentConfig = store.get('config') as SyncConfig;
    mainWindow.webContents.send('config-loaded', currentConfig);

    if (!queryWorker) {
      initWorkers(currentConfig);
    }

    ipcMain.on('runRule', async (event, rule: SyncRule) => {
      const sources = store.get('sources');
      const source = sources.find((source) => source.id === rule.sourceId);

      queryWorker.postMessage({
        event: 'handle-rule',
        data: {
          rule,
          source,
        },
      });

      queryWorker.once('message', (message) => {
        // console.log(message);
        event.reply('action-result', message);
      });
    });

    ipcMain.on('get-schedule-details', (event) => {
      event.reply('schedule-details', {
        isScheduled: scheduler.isScheduled,
        nextRunDate: scheduler.nextRunDate,
      });
    });

    // Start on run if schedule rule set
    const scheduleRule = store.get('scheduleRule');
    if (typeof scheduleRule === 'string') {
      scheduler.schedule(scheduleRule, (done) => {
        queryWorker.postMessage({
          event: 'handle-action',
          data: currentConfig.UploadActions[0],
        });

        queryWorker.once('message', (message) => {
          const { nextRunDate } = done();
          mainWindow.webContents.send('action-result', {
            ...message,
            nextRunDate,
          });
        });
      });
    }
  });

  // If a loading operation goes wrong, we'll send Electron back to
  // Ember App entry point
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(emberAppURL);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'killed') {
      console.log(
        'Your Ember app (or other code) in the main window has crashed.'
      );
      console.log(
        'This is a serious issue that needs to be handled and/or debugged.'
      );
    }
  });

  mainWindow.on('unresponsive', () => {
    console.log(
      'Your Ember app (or other code) has made the window unresponsive.'
    );
  });

  mainWindow.on('responsive', () => {
    console.log('The main window has become responsive again.');
  });

  mainWindow.on('closed', (e: Electron.IpcRendererEvent) => {
    e.preventDefault();
    mainWindow = null;
    // Stop the service
    console.log('window closed, stopping auth service');
    authService.stop();
    authService = undefined;
  });

  return mainWindow;
}

// Uncomment the lines below to enable Electron's crash reporter
// For more information, see http://electron.atom.io/docs/api/crash-reporter/
// electron.crashReporter.start({
//     productName: 'YourName',
//     companyName: 'YourCompany',
//     submitURL: 'https://your-domain.com/url-to-submit',
//     autoSubmit: true
// });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    console.log('closing because windows closed');
    app.quit();
  }
});

app.on('ready', async () => {
  // Mostly broken: Because of some changes in Chrome, in recent Electron versions (>=9 I think) they can't be loaded with file: protocol https://github.com/electron/electron/issues/24011),
  // and also devtron doesn't work for other reasons (https://github.com/electron/electron/issues/23676)
  // and also devtron has been mostly abandoned (https://github.com/electron-userland/devtron/issues/200).
  //
  // if (isDev) {
  //   try {
  //     require('devtron').install();
  //   } catch (err) {
  //     console.log('Failed to install Devtron: ', err);
  //   }
  //   try {
  //     await installExtension(EMBER_INSPECTOR);
  //   } catch (err) {
  //     console.log('Failed to install Ember Inspector: ', err);
  //   }
  // }

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
  console.log('An exception in the main thread was not handled.');
  console.log(
    'This is a serious issue that needs to be handled and/or debugged.'
  );
  console.log(`Exception: ${err}`);
  console.log(err.stack);
});
