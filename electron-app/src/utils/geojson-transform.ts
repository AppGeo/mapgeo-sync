import { Transform } from 'stream';

export default class ToGeoJSON extends Transform {
  constructor() {
    super({
      objectMode: true,
    });
  }
  _transform(chunk: Record<string, unknown>, _: unknown, next: () => void) {
    let geometry = null;
    let { the_geom, ...properties } = chunk;

    if (the_geom) {
      try {
        geometry =
          chunk.the_geom && typeof chunk.the_geom === 'string'
            ? JSON.parse(chunk.the_geom)
            : typeof chunk.the_geom === 'object'
            ? chunk.the_geom
            : null;
      } catch (e) {
        // noop
      }
    }

    this.push({
      type: 'Feature',
      geometry,
      properties,
    });
    next();
  }
}
