import { BrowserWindow } from 'electron';
import * as isDev from 'electron-is-dev';
import logger from './logger';

let bgWindow: BrowserWindow;

export function createBgRenderer() {
  bgWindow = new BrowserWindow({
    show: isDev,
    webPreferences: {
      // So we can use electron-store on the client
      enableRemoteModule: true,
      // details https://github.com/electron/electron/issues/23506
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  if (isDev) {
    bgWindow.webContents.openDevTools();
  }

  bgWindow.loadURL('file://' + __dirname + '/views/background.html');

  bgWindow.on('closed', () => {
    console.log('background window closed');
  });

  bgWindow.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'killed') {
      logger.log(
        'Your BG processing app (or other code) in the main window has crashed.'
      );
      logger.log(
        'This is a serious issue that needs to be handled and/or debugged.'
      );
    }
  });

  return bgWindow;
}
