import { Interpreter } from 'xstate';

export async function waitForState<T extends Interpreter<any, any, any>>(
  interpreter: T,
  states: string[],
  timeout: number = 4000
) {
  const match = states.find((stateKey) => interpreter.state.matches(stateKey));

  if (match) {
    return match;
  }

  return new Promise((resolve, reject) => {
    let time = new Date().getTime();

    const subscription = interpreter.subscribe((state) => {
      const match = states.find((stateKey) => state.matches(stateKey));
      let end = new Date().getTime();

      const elapsedMs = end - time;
      console.log(`waitForState time ${elapsedMs}ms`);

      if (match) {
        subscription.unsubscribe();
        return resolve(match);
      }

      if (elapsedMs >= timeout) {
        subscription.unsubscribe();
        reject(
          new Error(
            `waitForState [${states.join(', ')}] timed out after ${elapsedMs}ms`
          )
        );
      }
    });
  });
}
