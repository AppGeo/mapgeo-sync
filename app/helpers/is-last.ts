import { helper } from '@ember/component/helper';

export function isLast([item, items]: [unknown, unknown[]] /*, hash*/) {
  return items.lastObject === item;
}

export default helper(isLast);
