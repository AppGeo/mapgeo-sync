import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { IpcRendererEvent } from 'electron/renderer';
import Session from 'mapgeo-sync/services/session';

// Node modules
const { ipcRenderer } = requireNode('electron');

export default class Application extends Route {
  @service('router') declare router: RouterService;
  @service('session') declare session: Session;

  beforeModel() {
    ipcRenderer.on('authenticated', (_event: IpcRendererEvent) => {
      this.session.isAuthenticated = true;
      this.router.transitionTo('index');
    });
  }
}
