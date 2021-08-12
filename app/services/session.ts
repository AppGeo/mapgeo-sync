import { action } from '@ember/object';
import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { IpcRendererEvent } from 'electron/renderer';
import { NotificationsService } from '@frontile/notifications';
import RouterService from '@ember/routing/router-service';
// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Session extends Service {
  @service declare notifications: NotificationsService;
  @service declare router: RouterService;

  @tracked isAuthenticated?: boolean;

  @action
  setup(): void {
    ipcRenderer.on(
      'authenticated',
      (
        _event: IpcRendererEvent,
        {
          isAuthenticated,
          route,
          error,
        }: { isAuthenticated: boolean; route: string; error?: any }
      ) => {
        this.isAuthenticated = isAuthenticated;

        if (error) {
          this.notifications.add(error, { appearance: 'error' });
          return;
        }

        this.router.transitionTo(route);
      }
    );
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    session: Session;
  }
}
