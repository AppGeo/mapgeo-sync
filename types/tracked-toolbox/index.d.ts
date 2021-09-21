import ComputedProperty from '@ember/object/computed';

export function localCopy(name: string): ComputedProperty<unknown>; // @inject('store') foo      @inject() foo
export function trackedReset<T, C>(
  this: unknown,
  options: {
    memo: string;
    update: (this: C, component: unknown, key: string, last: T) => T;
  }
): ComputedProperty<unknown>; // @inject('store') foo      @inject() foo
