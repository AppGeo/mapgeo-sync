import * as Store from 'electron-store';
import { Source, SyncRule, SyncState } from '../../../types/mapgeo-sync-config';

export type SyncStoreType = {
  configUpdate?: Date;
  mapgeo: {
    host?: string;
    login?: {
      email: string;
      password: string;
    };
    config?: {
      name: string;
      datasets: { id: string; name: string }[];
    };
  };
  syncRules: SyncRule[];
  syncState: SyncState[];
  sources: Source[];
};

export type SyncStore = Store<SyncStoreType>;

export const store = new Store<SyncStoreType>();

console.log(`Store path: ${store.path}`);
