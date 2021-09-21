import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | rules/create', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:rules/create');
    assert.ok(route);
  });
});
