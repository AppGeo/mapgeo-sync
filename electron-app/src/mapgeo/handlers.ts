import { IpcMain } from 'electron';
import { store, SyncStore } from '../store';

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

export const fetchConfig = (store: SyncStore) => {
  return store.get('mapgeo.config');
};

export const findDataset = (store: SyncStore, id: string) => {
  const mapgeo = store.get('mapgeo');
  if (!mapgeo?.config) {
    return;
  }
  return mapgeo.config.datasets.find((dataset) => dataset.id === id);
};
