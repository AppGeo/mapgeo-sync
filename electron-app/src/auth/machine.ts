import { LoginData, SetupData } from 'mapgeo-sync-config';
import { createMachine, assign } from 'xstate';
import { store } from '../store/store';

export interface AuthContext {
  config: any;
  host: string;
  login?: {
    email: string;
    password: string;
  };
  loginError?: any;
  setupError?: any;
}

export type AuthEvent =
  | { type: 'SETUP'; payload: SetupData }
  | { type: 'LOGIN'; payload: LoginData }
  | { type: 'RESET' }
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
      context: AuthContext & { login: LoginData };
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
          states: {
            idle: {
              always: [
                { cond: 'needsMapgeoService', target: 'init' },
                { cond: 'hasLogin', target: 'login' },
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
                  target: '#auth.unauthenticated.withoutConfig',
                  actions: assign({
                    host: () => null,
                    config: () => null,
                  }),
                },
              },
            },
            validated: {
              entry: 'sendValidated',
              always: [
                {
                  cond: 'hasLogin',
                  target: 'login',
                },
              ],
              on: {
                LOGIN: {
                  target: 'login',
                  actions: assign({
                    login: (context, event) => {
                      store.set('mapgeo.login', event.payload);
                      return event.payload;
                    },
                  }),
                },
                RESET: {
                  target: '#auth.unauthenticated.withoutConfig',
                  actions: assign({
                    config: (context, event) => {
                      store.clear();
                      return undefined;
                    },
                  }),
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
                  actions: [
                    'authenticationFailed',
                    assign({
                      loginError: (context, event) => {
                        return event.data.message;
                      },
                      login: (context, event) => {
                        store.delete('mapgeo.login' as any);
                        return undefined;
                      },
                    }),
                  ],
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
                  target: 'fetchConfig',
                  actions: assign({
                    host: (context, event) => {
                      store.set('mapgeo.host', event.payload.mapgeoUrl);
                      return event.payload.mapgeoUrl;
                    },
                  }),
                },
              },
            },
            fetchConfig: {
              invoke: {
                id: 'fetchConfig',
                src: 'setupMapgeoService',
                onDone: '#auth.unauthenticated.withConfig',
                onError: {
                  target: '#auth.unauthenticated.withoutConfig',
                  actions: assign({
                    host: () => null,
                    config: () => null,
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
          actions: [
            'logout',
            assign({
              login: undefined,
            }),
          ] as any,
        },
      },
    },
  },
});
