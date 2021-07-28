import { App } from 'electron';
import { spawn as _spawn } from 'child_process';
import * as path from 'path';
import logger from './logger';

/**
 * Mostly copied from here: https://github.com/electron/windows-installer#handling-squirrel-events
 *
 * @param app
 * @param version
 * @returns
 */
export function handleSquirrelEvent(app: App, version: string) {
  if (process.argv.length === 1) {
    return false;
  }

  const logScope = logger.scope('squirrel-startup');
  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.join(
    rootAtomFolder,
    `app-${version}`,
    path.basename(process.execPath)
  );

  const spawn = function (command: string, args: readonly string[]) {
    let spawnedProcess;

    try {
      spawnedProcess = _spawn(command, args, { detached: true });
    } catch (error) {
      logScope.error('spawn error', error);
    }

    return spawnedProcess;
  };

  const spawnUpdate = function (args: readonly string[]) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
}
