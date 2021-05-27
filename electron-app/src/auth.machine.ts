import { createMachine, assign } from 'xstate';

export const authMachine = createMachine({
  // Machine identifier
  id: 'auth',
  context: {
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
              return (event as any).payload;
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
