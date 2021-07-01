import { SetupData } from 'mapgeo-sync-config';
import { createMachine, assign } from 'xstate';
import { store } from './store';

export interface AuthContext {
  config: any;
  host: string;
  login?: {
    email: string;
    password: string;
  };
  setupError?: any;
}

export type AuthEvent =
  | { type: 'SETUP'; payload: SetupData }
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' };

export type AuthState =
  | {
      value: 'unauthenticated.idle';
      context: AuthContext & { config: boolean };
    }
  | { value: 'unauthenticated.withoutConfig.idle'; context: AuthContext }
  | { value: 'unauthenticated.withConfig.idle'; context: AuthContext }
  | { value: 'finishSetup'; context: AuthContext & { host: string } }
  | {
      value: 'login';
      context: AuthContext & { login: { email: string; password: string } };
    };

export const authMachine = createMachine<AuthContext, AuthEvent, AuthState>({
  // Machine identifier
  id: 'auth',
  context: {
    config: undefined,
    host: undefined,
    login: undefined,
  },
  // Initial state
  initial: 'unauthenticated',
  states: {
    unauthenticated: {
      initial: 'idle',
      entry: 'sendIsUnauthenticated',
      states: {
        idle: {
          always: [
            { target: 'withConfig', cond: 'hasCommunityConfig' },
            { target: 'withoutConfig' },
          ],
        },
        withConfig: {
          initial: 'idle',
          entry: 'initMapgeoService',
          states: {
            idle: {
              always: [
                { cond: 'needsMapgeoService', target: 'init' },
                {
                  target: 'validated',
                },
              ],
            },
            init: {
              invoke: {
                id: 'setupMapgeoService',
                src: 'setupMapgeoService',
                onDone: 'validated',
                onError: {
                  target: '#auth.unauthenticated',
                  actions: assign({
                    host: () => null,
                  }),
                },
              },
            },
            validated: {
              on: {
                LOGIN: {
                  target: 'login',
                },
              },
            },
            login: {
              invoke: {
                id: 'loginMapgeo',
                src: 'loginMapgeo',
                onDone: '#auth.authenticated',
                onError: {
                  target: '#auth.unauthenticated.idle',
                  actions: 'authenticationFailed',
                },
              },
            },
          },
        },
        withoutConfig: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                SETUP: {
                  target: '#auth.unauthenticated.idle',
                  actions: assign({
                    host: (context, event) => {
                      store.set('mapgeo.host', event.payload.mapgeoUrl);
                      return event.payload.mapgeoUrl;
                    },
                  }),
                },
              },
            },
          },
        },
      },
    },

    authenticated: {
      entry: 'authenticated',
      on: {
        LOGOUT: {
          target: 'unauthenticated',
          actions: 'logout',
        },
      },
    },
  },
});
