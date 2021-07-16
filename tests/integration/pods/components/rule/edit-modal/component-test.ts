import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | Rule::EditModal', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });
    this.set('rule', {
      name: 'Test Rule',
    });
    this.set('noop', () => {});

    await render(
      hbs`<Rule::EditModal
        @rule={{this.rule}}
        @isOpen={{true}}
        @onClose={{this.noop}}
      />`
    );

    assert.dom(this.element).containsText('Test Rule');
  });
});
