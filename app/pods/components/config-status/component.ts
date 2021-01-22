import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import ElectronStore from 'mapgeo-sync/services/electron-store';
import {
  NotificationOptions,
  NotificationsService,
} from '@frontile/notifications';
import type { IpcRendererEvent } from 'electron';
// Node modules
const { ipcRenderer } = requireNode('electron');

interface ConfigStatusArgs {}

export default class ConfigStatus extends Component<ConfigStatusArgs> {
  @service electronStore!: ElectronStore;
  @service notifications!: NotificationsService;

  @tracked config: any;
  @tracked configUpdated?: Date = this.electronStore.getValue('configUpdated');
  @tracked options: NotificationOptions = {
    appearance: 'info',
    preserve: false,
    duration: 5000,
    allowClosing: true,
  };

  constructor(owner: unknown, args: ConfigStatusArgs) {
    super(owner, args);

    ipcRenderer.on('config-loaded', (_event: IpcRendererEvent, config: any) => {
      this.config = config;
      this.configUpdated = this.electronStore.getValue('configUpdated');
    });

    ipcRenderer.on(
      'action-result',
      (_event: IpcRendererEvent, result: any[]) => {
        this.notifications.add(
          `Action succeeded with ${result.length} items`,
          this.options
        );
      }
    );
  }

  get configString() {
    try {
      return JSON.stringify(this.config, null, 2).trim();
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
