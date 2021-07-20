import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | rule/runs', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:rule/runs');
    assert.ok(route);
  });
});
