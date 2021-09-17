import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | setup/index', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:setup/index');
    assert.ok(route);
  });
});
