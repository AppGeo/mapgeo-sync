/* eslint-disable no-console */
// import installExtension, { EMBER_INSPECTOR } from 'electron-devtools-installer';
import { URL, pathToFileURL } from 'url';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as Store from 'electron-store';
import handleFileUrls from './handle-file-urls';
import handleQueryAction, { QueryAction } from './action-handlers/query';

const store = new Store();
const emberAppDir = path.resolve(__dirname, '..', 'ember-dist');
const emberAppURL = pathToFileURL(
  path.join(emberAppDir, 'index.html')
).toString();

let mainWindow: BrowserWindow | null = null;

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

  await handleFileUrls(emberAppDir);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
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
    mainWindow.webContents.send(
      'config-loaded',
      store.get('config') || { config: true }
    );

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
      event.reply('config-loaded', config);
    });

    ipcMain.on('run-action', async (event, action: QueryAction) => {
      const config: any = store.get('config');
      if (!config?.MapGeoOptions?.Host) {
        throw new Error('MapGeoOptions.Host is a required config property');
      }
      const url = new URL(config.MapGeoOptions.Host);
      const subdomain = url.hostname.split('.')[0];
      const result = await handleQueryAction(subdomain, action);
      console.log(result);
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
