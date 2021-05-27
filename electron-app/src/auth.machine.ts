import { SetupData } from 'mapgeo-sync-config';
import { createMachine, assign } from 'xstate';

export interface AuthContext {
  config: any;
  host: string;
  login?: {
    email: string;
    password: string;
  };
}

export type AuthEvent = { type: 'SETUP'; payload: SetupData };

export type AuthState =
  | { value: 'idle'; context: AuthContext }
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
  initial: 'idle',
  states: {
    idle: {
      always: [
        { target: 'finishSetup', cond: 'needsMapgeoService' },
        { target: 'login', cond: 'hasLogin' },
        {
          actions: 'needsSetup',
        },
      ],
      on: {
        SETUP: {
          target: 'finishSetup',
          cond: 'needsMapgeoService',
          actions: assign({
            // increment the current count by the event value
            host: (context, event) => {
              debugger;
              console.log(event);
              return event.payload.mapgeoUrl;
            },
          }),
        },
      },
    },
    finishSetup: {
      invoke: {
        id: 'setupMapgeoService',
        src: 'setupMapgeoService',
        onDone: [
          {
            target: 'login',
            cond: 'hasLogin',
            actions: assign({
              config: (context, event) => {
                console.log(event);

                return event.data;
              },
            }),
          },
          {
            actions: 'askForLogin',
          },
        ],
        onError: {
          actions: 'setupMapgeoFailed',
        },
      },
    },
    login: {
      invoke: {
        id: 'loginMapgeo',
        src: 'loginMapgeo',
        onDone: {
          actions: 'authenticated',
        },
        onError: {
          actions: 'authenticationFailed',
        },
      },
    },
  },
});
