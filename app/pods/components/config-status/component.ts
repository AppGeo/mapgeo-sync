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
import type { QueryAction, SyncConfig } from 'mapgeo-sync-config';
// Node modules
const { ipcRenderer } = requireNode('electron');

interface ConfigStatusArgs {
  config: SyncConfig;
  selectNewConfig: () => void;
}

export default class ConfigStatus extends Component<ConfigStatusArgs> {
  @service declare electronStore: ElectronStore;
  @service declare notifications: NotificationsService;

  @tracked scheduleRule?: string = '30 * * * * *';
  @tracked isScheduleModalOpen = false;
  @tracked isScheduled = false;
  @tracked running = false;
  @tracked nextRunDate?: Date;
  @tracked config: any;
  @tracked status: any;
  @tracked errors?: string[];
  @tracked configUpdated?: Date;
  @tracked options: NotificationOptions = {
    appearance: 'info',
    preserve: false,
    duration: 5000,
    allowClosing: true,
  };

  constructor(owner: unknown, args: ConfigStatusArgs) {
    super(owner, args);

    this.configUpdated = this.electronStore.getValue('configUpdated');
    this.scheduleRule = this.electronStore.getValue('scheduleRule');

    ipcRenderer.on(
      'action-result',
      (
        _event: IpcRendererEvent,
        result: {
          status: { ok: boolean };
          rows: Record<string, unknown>[];
          errors?: { message: string }[];
        }
      ) => {
        this.running = false;
        const returnedError = result.errors || !result.status?.ok;

        if (returnedError) {
          this.status = result.status;
          this.errors = result.errors?.map((e) => e.message);
          const error = this.errors?.join(', ') ?? '';

          this.notifications.add(`Action failed. ${error}`, {
            appearance: 'warning',
          });
        } else {
          this.notifications.add(
            `Action succeeded. Query returned ${result.rows?.length} items`,
            this.options
          );
          console.table(result.rows.slice(0, 3));
        }
      }
    );

    ipcRenderer.on(
      'action-error',
      (
        _event: IpcRendererEvent,
        result: { errors: { message: string; event: string }[] }
      ) => {
        this.notifications.add(result.errors.mapBy('message').join('/n'), {
          appearance: 'error',
        });
      }
    );

    ipcRenderer.on(
      'schedule-details',
      (
        _event: IpcRendererEvent,
        result: { isScheduled: boolean; nextRunDate?: Date }
      ) => {
        this.isScheduled = result.isScheduled;
        this.nextRunDate = result.nextRunDate;
      }
    );
  }

  get configString() {
    try {
      return JSON.stringify(this.args.config, null, 2).trim();
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
  onConfigUpdated() {
    this.configUpdated = this.electronStore.getValue('configUpdated');
    this.status = undefined;
  }

  @action
  openScheduleModal() {
    ipcRenderer.send('get-schedule-details');
    this.isScheduleModalOpen = true;
  }

  @action
  scheduleAction(event: Event) {
    event.preventDefault();
    ipcRenderer.send('schedule-action', this.scheduleRule);
    this.isScheduleModalOpen = false;
  }

  @action
  runAction(uploadAction: QueryAction) {
    this.status = undefined;
    this.running = true;
    ipcRenderer.send('run-action', uploadAction);
  }
}
