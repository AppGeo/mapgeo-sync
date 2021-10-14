import { action } from '@ember/object';
import Component from '@glimmer/component';

interface SourceCardArgs {
  onDelete: () => void;
}

export default class SourceCard extends Component<SourceCardArgs> {
  @action
  onDelete() {
    if (window.confirm('Are you sure?')) {
      this.args.onDelete();
    }
  }
}
