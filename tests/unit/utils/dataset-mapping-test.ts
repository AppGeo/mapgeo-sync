import { getAllMappings } from 'mapgeo-sync/utils/dataset-mapping';
import { module, test } from 'qunit';

module('Unit | Utility | dataset-mapping', function () {
  // Replace this with your real tests.
  test('it works', function (assert) {
    const result = getAllMappings({
      dataMapping: 'a',
      geometryMapping: 'b',
      intersectionMapping: 'c',
      tableMappings: ['d'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    assert.ok(result);
  });
});
