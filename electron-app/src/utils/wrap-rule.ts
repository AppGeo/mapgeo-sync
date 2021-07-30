import { RuleBundle, SyncRule } from 'mapgeo-sync-config';
import { store } from '../store/store';

export default function wrapRule(rule: SyncRule): RuleBundle {
  const sources = store.get('sources') || [];
  const source = sources.find((source) => source.id === rule.sourceId);

  return {
    rule,
    source,
  };
}
