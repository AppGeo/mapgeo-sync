import { helper } from '@ember/component/helper';
import Component from '@glimmer/component';
import { formatDistance } from 'date-fns';
import { RuleLogItem } from 'mapgeo-sync-config';

interface RuleLogItemArgs {
  item: RuleLogItem;
}

export default class RuleLogItemComponent extends Component<RuleLogItemArgs> {
  distance = helper(([log]: [RuleLogItem]) => {
    return formatDistance(new Date(log.endedAt), new Date(log.startedAt));
  });
}
