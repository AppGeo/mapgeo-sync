import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | loading', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:loading');
    assert.ok(route);
  });
});
