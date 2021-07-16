import { action } from '@ember/object';
import Service from '@ember/service';
import { SyncRule, SyncState } from 'mapgeo-sync-config';
import type { IpcRendererEvent } from 'electron';
import { tracked } from '@glimmer/tracking';
const { ipcRenderer } = requireNode('electron/renderer');

export default class Platform extends Service {
  // once(name: string, cb: (...args: any[]) => void) {
  //   ipcRenderer.once(name, cb);
  // }
  @tracked syncState: SyncState[] = [];

  constructor() {
    super();
    ipcRenderer.on(
      'syncStateUpdated',
      (_event: IpcRendererEvent, results: SyncState[]) => {
        this.syncState = results;
      }
    );

    this.findSyncState().then((results) => (this.syncState = results));
  }

  @action
  async checkMapGeo(mapgeoUrl: string) {
    const isOk = await ipcRenderer.invoke('checkMapgeo', { mapgeoUrl });

    return isOk as boolean;
  }

  @action
  async fetchCommunity() {
    const value = await ipcRenderer.invoke('mapgeo/fetchConfig');
    return value;
  }

  @action
  async findDataset(id: string) {
    const value = await ipcRenderer.invoke('mapgeo/findDataset', id);
    return value;
  }

  @action
  async findSyncState() {
    const value = await ipcRenderer.invoke('store/findSyncState');
    return value;
  }

  @action
  runSyncRule(rule: SyncRule) {
    return new Promise((resolve) => {
      ipcRenderer.send('runRule', rule);
      ipcRenderer.on(
        'action-result',
        (
          _event: IpcRendererEvent,
          result: {
            status: { ok: boolean };
            rows: Record<string, unknown>[];
            errors?: { message: string }[];
          }
        ) => {
          resolve(result);
        }
      );
    });
  }

  @action
  async startSyncRuleSchedule(rule: SyncRule) {
    const res = await ipcRenderer.invoke('startSyncRuleSchedule', rule);

    return res as SyncState;
  }

  @action
  async cancelSyncRuleSchedule(rule: SyncRule) {
    const res = await ipcRenderer.invoke('cancelSyncRuleSchedule', rule);

    return res as SyncState;
  }

  @action
  async logout() {
    const value = await ipcRenderer.invoke('logout');
    return value;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    platform: Platform;
  }
}
