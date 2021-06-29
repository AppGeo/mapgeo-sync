import { authMachine } from '../src/auth.machine';
import { interpret } from 'xstate';
import * as t from 'tap';

t.test('Should start in unathenticated without config', (t) => {
  let transitions = 0;
  let unathenticatedCalled = false;
  let initMapgeoServiceCalled = false;
  const authService = interpret(
    authMachine.withConfig({
      guards: {
        hasCommunityConfig(context) {
          return Boolean(context.config);
        },
      },
      actions: {
        sendIsUnauthenticated() {
          unathenticatedCalled = true;
        },
        initMapgeoService() {
          initMapgeoServiceCalled = true;
        },
      },
    })
  ).onTransition((state) => {
    transitions++;
    // this is where you expect the state to eventually
    // be reached

    // Debug
    // console.log(state.event.type);
    // console.log(state.value);
    if (transitions === 1) {
      t.ok(
        state.matches('unauthenticated.withoutConfig.idle'),
        'state matches; no config'
      );
      t.ok(unathenticatedCalled, 'unauthenticated action called');
    } else if (transitions === 2) {
      t.ok(
        state.matches('unauthenticated.withConfig.idle'),
        'state matches; has config'
      );
      t.ok(initMapgeoServiceCalled, 'initMapgeoService action called');

      t.end();
    }
  });

  authService.start();

  // send zero or more events to the service that should
  // cause it to eventually reach its expected state
  authService.send({ type: 'SETUP' });
});
