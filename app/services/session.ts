import { action } from '@ember/object';
import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { IpcRendererEvent } from 'electron/renderer';
import { Promise } from 'rsvp';
import { NotificationsService } from '@frontile/notifications';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Session extends Service {
  @service declare notifications: NotificationsService;

  @tracked isAuthenticated = false;

  @action
  waitForAuthentication(): Promise<boolean> {
    return new Promise((resolve) => {
      ipcRenderer.on(
        'authenticated',
        (
          _event: IpcRendererEvent,
          { isAuthenticated, error }: { isAuthenticated: boolean; error?: any }
        ) => {
          this.isAuthenticated = isAuthenticated;
          if (error) {
            this.notifications.add(error, { appearance: 'error' });
          }
          resolve(isAuthenticated);
        }
      );
    });
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    session: Session;
  }
}
