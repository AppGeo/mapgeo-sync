import Service from '@ember/service';
const { ipcRenderer } = requireNode('electron');

export default class ElectronStore extends Service {
  async getValue(key: string) {
    const value = await ipcRenderer.invoke('getStoreValue', key);

    return value;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'electron-store': ElectronStore;
  }
}
