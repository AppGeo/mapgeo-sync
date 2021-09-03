import { Transform } from 'stream';

export default class Batcher<T = Record<string, unknown>> extends Transform {
  size: number;
  queue: T[];

  constructor(size?: number) {
    super({
      objectMode: true,
    });
    this.size = size || 50000;
    this.queue = [];
  }
  _transform(item: T, _: unknown, next: () => void) {
    this.queue.push(item);
    if (this.queue.length >= this.size) {
      let queue = this.queue;
      this.queue = [];
      this.push(queue);
    }
    next();
  }
  _flush(done: () => void) {
    if (this.queue.length) {
      this.push(this.queue);
    }
    done();
  }
}
