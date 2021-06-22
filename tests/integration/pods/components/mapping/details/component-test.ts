import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | mapping/details', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });
    this.set('mapping', {
      provider: {
        resource: 'test_table',
      },
    });

    await render(hbs`<Mapping::Details @mapping={{this.mapping}}/>`);

    assert.dom(this.element).containsText('test_table');
  });
});
