import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import type { IpcRendererEvent } from 'electron';
// Node modules
const { ipcRenderer } = requireNode('electron');

interface ConfigStatusArgs {}

export default class ConfigStatus extends Component<ConfigStatusArgs> {
  @tracked config: any;

  constructor(owner: unknown, args: ConfigStatusArgs) {
    super(owner, args);

    ipcRenderer.on('config-loaded', (_event: IpcRendererEvent, config: any) => {
      this.config = config;
    });
  }

  get configString() {
    try {
      return JSON.stringify(this.config, null, 2);
    } catch (e) {
      return e;
    }
  }

  @action
  selectNewConfig() {
    ipcRenderer.send('select-config');
  }

  @action
  runAction(uploadAction: any) {
    ipcRenderer.send('run-action', uploadAction);
  }
}
