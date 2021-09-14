import { Transform } from 'stream';

export default class GeoJSONFeatureCollectionStream extends Transform {
  first = false;

  constructor() {
    super({ objectMode: true });
    this.first = true;
  }

  _transform(chunk: Record<string, unknown>, _: unknown, next: () => void) {
    if (this.first) {
      this.push('{"type":"FeatureCollection","features":[');
      this.first = false;
    } else {
      this.push('\n,\n');
    }
    this.push(JSON.stringify(chunk));
    next();
  }

  _final(done: () => void) {
    this.push(']}');
    done();
  }
}
