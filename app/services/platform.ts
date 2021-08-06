import { action } from '@ember/object';
import Service from '@ember/service';
import { Source, SyncRule, SyncState } from 'mapgeo-sync-config';
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
  runSyncRule(rule: SyncRule, runId: string) {
    return new Promise((resolve) => {
      ipcRenderer.send('runRule', rule, runId);
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

  @action
  async selectSourceFolder(): Promise<string> {
    const folder = await ipcRenderer.invoke('selectSourceFolder');
    return folder;
  }

  @action
  async selectSourceFile(sourceId: string): Promise<string> {
    const file = await ipcRenderer.invoke('selectSourceFile', sourceId);
    return file;
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
