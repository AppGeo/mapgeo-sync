import Service from '@ember/service';
const Store = requireNode('electron-store');
const store = new Store();

export default class ElectronStore extends Service {
  getValue(key: string) {
    return store.get(key);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'electron-store': ElectronStore;
  }
}
