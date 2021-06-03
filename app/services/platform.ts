import Service from '@ember/service';
const { ipcRenderer } = requireNode('electron/renderer');

export default class Platform extends Service {
  // once(name: string, cb: (...args: any[]) => void) {
  //   ipcRenderer.once(name, cb);
  // }

  async fetchCommunity() {
    const value = await ipcRenderer.invoke('mapgeo/fetchConfig');
    return value;
  }

  async findDataset(id: string) {
    const value = await ipcRenderer.invoke('mapgeo/findDataset', id);
    return value;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    platform: Platform;
  }
}
