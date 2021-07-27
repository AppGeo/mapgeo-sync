import ComputedProperty from '@ember/object/computed';

export function localCopy(name: string): ComputedProperty<unknown>; // @inject('store') foo      @inject() foo
