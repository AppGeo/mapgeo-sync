import { IpcMain } from 'electron';
import { store, SyncStore } from '../store/store';
import MapgeoService, { getService } from './service';

export function register(ipcMain: IpcMain) {
  const add = (
    name: string,
    handle: (store: SyncStore, ...args: any[]) => any
  ) =>
    ipcMain.handle(`mapgeo/${name}`, (event, ...args) => {
      return handle(store, ...args);
    });

  add('fetchConfig', fetchConfig);
  add('findDataset', findDataset);
}

export const fetchConfig = async (store: SyncStore) => {
  const url = store.get<string, string>('mapgeo.host');

  if (!url) {
    throw new Error('MapGeo host not set, please setup/login first');
  }

  const config = await MapgeoService.fetchConfig(url);

  if (config) {
    store.set('mapgeo.config', config);
  }

  return config;
};

export const findDataset = async (store: SyncStore, id: string) => {
  const mapgeo = store.get('mapgeo');
  if (!mapgeo?.config) {
    return;
  }
  const service = getService();

  const dataset = await service.findDataset(id);
  return dataset;
};
