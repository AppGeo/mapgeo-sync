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

  @tracked running = false;
  @tracked config: any;
  @tracked status: any;
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
      this.status = undefined;
    });

    ipcRenderer.on(
      'action-result',
      (_event: IpcRendererEvent, result: { status: any; rows: any[] }) => {
        this.notifications.add(
          `Action ${
            result.status.ok ? 'succeeded' : 'failed'
          }. Query returned ${result.rows.length} items`,
          this.options
        );
        console.table(result.rows.slice(0, 3));
        this.running = false;

        if (!result.status.ok) {
          this.status = result.status;
        }
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

  get statusString() {
    try {
      return JSON.stringify(this.status, null, 2).trim();
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
    this.status = undefined;
    this.running = true;
    ipcRenderer.send('run-action', uploadAction);
  }
}
