import { BrowserWindow, Notification } from 'electron';
import * as isDev from 'electron-is-dev';
import logger from './logger';

let bgWindow: BrowserWindow;

export function createBgRenderer() {
  const closedNotification = new Notification({
    title: 'Background process has errored/closed.',
    body: 'Please restart MapGeo Sync. If this keeps happening please contact customer support at support@mapgeo.io with details.',
  });

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

  bgWindow.webContents.openDevTools();

  bgWindow.loadURL('file://' + __dirname + '/views/background.html');

  bgWindow.on('closed', () => {
    logger.log(
      'background window closed. If this was unintentional (not when the rest of the app closed), restart the app.'
    );
  });

  bgWindow.webContents.on('render-process-gone', (_event, details) => {
    closedNotification.show();

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
