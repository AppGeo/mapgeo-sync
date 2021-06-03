import * as Store from 'electron-store';

export type SyncStoreType = {
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
};

export type SyncStore = Store<SyncStoreType>;

export const store = new Store<SyncStoreType>();
