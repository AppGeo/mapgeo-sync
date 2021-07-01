import { action } from '@ember/object';
import Service from '@ember/service';
import { SyncRule } from 'mapgeo-sync-config';
const { ipcRenderer } = requireNode('electron/renderer');

export default class ElectronStore extends Service {
  @action
  async getValue(key: string) {
    const value = await ipcRenderer.invoke('getStoreValue', key);

    return value;
  }

  @action
  async findSyncRules(): Promise<SyncRule[]> {
    const value = await ipcRenderer.invoke('store/findSyncRules');
    return value;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'electron-store': ElectronStore;
  }
}
