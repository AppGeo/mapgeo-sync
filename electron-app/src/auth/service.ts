import { interpret } from 'xstate';
import MapgeoService from '../mapgeo/service';
import { store } from '../store/store';
import { authMachine } from './machine';
import logger from '../logger';
import logState from '../utils/log-state';

const logScope = logger.scope('auth service');

interface ServiceOptions {
  send: (event: string, payload?: unknown) => void;
  getMapgeoService: () => MapgeoService;
  setMapgeoService: (service: MapgeoService | undefined) => void;
}

export const createService = ({
  send,
  getMapgeoService,
  setMapgeoService,
}: ServiceOptions) => {
  const authService = interpret(
    authMachine
      .withContext({
        config: store.get('mapgeo.config'),
        host: store.get('mapgeo.host'),
        login: store.get('mapgeo.login'),
      })
      .withConfig({
        guards: {
          hasCommunityConfig(context) {
            return Boolean(context.host);
          },
          needsMapgeoService(context) {
            return getMapgeoService() === undefined;
          },
          hasLogin(context) {
            return Boolean(context?.login);
          },
        },
        actions: {
          sendValidated() {
            send('redirect', {
              route: 'login',
            });
          },
          sendIsUnauthenticated() {
            send('authenticated', {
              isAuthenticated: false,
            });
          },
          authenticated() {
            send('authenticated', {
              isAuthenticated: true,
              route: 'index',
            });
          },
          authenticationFailed(context, other) {
            send('authenticated', {
              isAuthenticated: false,
            });
          },
          needsSetup() {
            send('authenticated', {
              isAuthenticated: false,
            });
          },
          setupMapgeoFailed(context) {
            console.log('setupError', context.setupError);
            send('authenticated', {
              isAuthenticated: false,
              error: context.setupError?.message,
            });
          },
          logout() {
            getMapgeoService()?.logout();
            store.delete('mapgeo.login' as any);
          },
        },
        services: {
          async setupMapgeoService(context) {
            const mapgeoService = await MapgeoService.fromUrl(context.host);
            setMapgeoService(mapgeoService);
            store.set('mapgeo.config', mapgeoService.config);
            console.log('mapgeo service setup');
            return mapgeoService.config;
          },
          loginMapgeo(context) {
            return getMapgeoService().login(
              context.login.email,
              context.login.password
            );
          },
        },
      })
  );

  authService.subscribe((state) =>
    logScope.log('auth state: ', logState({ state } as any))
  );

  return authService;
};
