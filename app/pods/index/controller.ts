import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import type { IpcRendererEvent } from 'electron';
import type { SyncConfig } from 'mapgeo-sync-config';
import { Model } from './route';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Index extends Controller {
  @service declare electronStore: ElectronStore;

  declare model: Model;

  @action
  waitForConfig() {
    ipcRenderer.on(
      'config-loaded',
      (_event: IpcRendererEvent, config: SyncConfig) => {
        this.model.config = config;
      }
    );
  }

  @action
  selectNewConfig() {
    ipcRenderer.send('select-config');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: Index;
  }
}
