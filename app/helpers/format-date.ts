import { helper } from '@ember/component/helper';
const intl = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'long',
});

export function formatDate([date]: [Date | string] /*, hash*/) {
  if (!date) {
    return '';
  }
  return intl.format(new Date(date));
}

export default helper(formatDate);
