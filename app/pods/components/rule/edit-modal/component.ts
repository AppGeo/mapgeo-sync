import Component from '@glimmer/component';
import { SyncRule } from 'mapgeo-sync-config';

interface RuleEditModalArgs {
  isOpen: boolean;
  rule: SyncRule;
  onClose: () => void;
  onSubmit: (rule: SyncRule) => void;
  onDelete: () => void;
}

export default class RuleEditModal extends Component<RuleEditModalArgs> {}
