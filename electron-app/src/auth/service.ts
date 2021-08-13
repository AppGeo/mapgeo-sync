import { interpret } from 'xstate';
import MapgeoService from '../mapgeo/service';
import { store } from '../store/store';
import { authMachine } from './machine';
import logger from '../logger';
import logState from '../utils/log-state';

const log = logger.scope('auth service');

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
            return (
              Boolean(store.get<string>('mapgeo.host')) || Boolean(context.host)
            );
          },
          needsMapgeoService(context) {
            return getMapgeoService() === undefined && Boolean(context.host);
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
            setMapgeoService(undefined);
            store.clear();
          },
        },
        services: {
          async setupMapgeoService(context) {
            const mapgeoService = await MapgeoService.fromUrl(context.host);
            setMapgeoService(mapgeoService);
            store.set('mapgeo.config', mapgeoService.config.community);
            console.log('mapgeo service setup');
            return mapgeoService.config.community;
          },
          loginMapgeo(context) {
            return getMapgeoService().login(
              context.login.email,
              context.login.password
            );
          },
        },
      })
  ).onTransition((state) =>
    log.log('auth transition: ', logState({ state } as any))
  );

  return authService;
};
