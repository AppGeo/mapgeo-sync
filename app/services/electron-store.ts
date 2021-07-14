import { action } from '@ember/object';
import Service from '@ember/service';
import { Source, SyncRule } from 'mapgeo-sync-config';
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

  @action
  async addSyncRule(rule: SyncRule): Promise<SyncRule[]> {
    const rules = await ipcRenderer.invoke('store/addSyncRule', rule);
    return rules;
  }

  @action
  async removeSyncRule(rule: SyncRule): Promise<SyncRule[]> {
    const rules = await ipcRenderer.invoke('store/removeSyncRule', rule);
    return rules;
  }

  @action
  async findSources(): Promise<Source[]> {
    const sources = await ipcRenderer.invoke('store/findSources');
    return sources;
  }

  @action
  async addSource(source: Source): Promise<Source[]> {
    const sources = await ipcRenderer.invoke('store/addSource', source);
    return sources;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'electron-store': ElectronStore;
  }
}
