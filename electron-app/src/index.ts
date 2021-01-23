/* eslint-disable no-console */
// import installExtension, { EMBER_INSPECTOR } from 'electron-devtools-installer';
import { URL, pathToFileURL } from 'url';
import { app, BrowserWindow, Tray, Menu, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as Store from 'electron-store';
import { MessageChannel } from 'worker_threads';
debugger;
// @ts-ignore
import * as Bree from 'bree';
import handleFileUrls from './handle-file-urls';
import handleQueryAction from './action-handlers/query';
import type { QueryAction, SyncConfig } from 'mapgeo-sync-config';

const { port1, port2 } = new MessageChannel();
const store = new Store();
const bree = new Bree({
  root: path.join(__dirname, 'jobs'),
  jobs: [],
});
const emberAppDir = path.resolve(__dirname, '..', 'ember-dist');
const emberAppURL = pathToFileURL(
  path.join(emberAppDir, 'index.html')
).toString();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null;

function createBrowserWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,

    webPreferences: {
      // So we can use electron-store on the client
      enableRemoteModule: true,
      // details https://github.com/electron/electron/issues/23506
      contextIsolation: false,
      // to use ipcRenderer and events from main process (here)
      nodeIntegration: true,
    },
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // If you want to open up dev tools programmatically, call
  // mainWindow.openDevTools();

  // Load the ember application
  mainWindow.loadURL(emberAppURL);

  // Ember app has loaded, send an event
  mainWindow.webContents.on('did-finish-load', () => {
    let currentConfig = store.get('config') as SyncConfig;
    mainWindow.webContents.send('config-loaded', currentConfig);

    if (currentConfig) {
      bree.add([
        {
          name: 'query-action',
          worker: {
            transferList: [port1],
            workerData: { config: currentConfig, port: port1 },
          },
        },
      ]);
    }
    bree.run();

    ipcMain.on('select-config', async (event) => {
      const result = await dialog.showOpenDialog({
        message: 'Select config.json file',
        properties: ['openFile'],
      });
      // Prompt cancelled
      if (!result.filePaths[0]) {
        return;
      }
      const configBuffer = await fs.promises.readFile(result.filePaths[0]);
      const config = JSON.parse(configBuffer.toString());

      store.set('config', config);
      store.set('configUpdated', new Date());
      event.reply('config-loaded', config);
    });

    ipcMain.on('run-action', async (event, action: QueryAction) => {
      const { port1, port2 } = new MessageChannel();
      bree.remove('query-action');
      bree.add([
        {
          name: 'query-action',
          worker: {
            transferList: [port1],
            workerData: { config: store.get('config'), action, port: port1 },
          },
        },
      ]);
      port2.on('message', (message) => {
        console.log(message);
        event.reply('action-result', message);
      });
      bree.start('query-action');
      // const config: any = store.get('config');
      // if (!config?.MapGeoOptions?.Host) {
      //   throw new Error('MapGeoOptions.Host is a required config property');
      // }
      // const url = new URL(config.MapGeoOptions.Host);
      // const subdomain = url.hostname.split('.')[0];
      // const result = await handleQueryAction(subdomain, action);
      // console.log(result);
      // event.reply('action-result', result);
    });

    ipcMain.on('schedule-action', async (event, action: QueryAction) => {
      bree.start('query-action');
    });
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

  mainWindow.on('closed', () => {
    mainWindow = null;
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
});
