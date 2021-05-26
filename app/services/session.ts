import { action } from '@ember/object';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { IpcRendererEvent } from 'electron/renderer';
import { Promise } from 'rsvp';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Session extends Service {
  @tracked isAuthenticated = false;

  @action
  waitForAuthentication(): Promise<boolean> {
    return new Promise((resolve) => {
      ipcRenderer.on(
        'authenticated',
        (
          _event: IpcRendererEvent,
          { isAuthenticated }: { isAuthenticated: boolean }
        ) => {
          this.isAuthenticated = isAuthenticated;
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
