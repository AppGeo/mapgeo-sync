import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | dataset/mapping/index', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:dataset/mapping/index');
    assert.ok(route);
  });
});
