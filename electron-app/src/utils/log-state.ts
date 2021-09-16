import { AuthContext } from '../auth/machine';
import { EventObject, Interpreter } from 'xstate';

export default function logState(
  service: Interpreter<
    AuthContext,
    any,
    EventObject,
    {
      value: any;
      context: AuthContext;
    }
  >
): string {
  const strings = service.state.toStrings();
  const last = strings[strings.length - 1];
  return `${service.state.event.type} => ${last}`;
}
