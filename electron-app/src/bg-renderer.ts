import { BrowserWindow } from 'electron';
import * as isDev from 'electron-is-dev';

let bgWindow: BrowserWindow;

export function createBgRenderer() {
  bgWindow = new BrowserWindow({
    // show: false,
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

  return bgWindow;
}
