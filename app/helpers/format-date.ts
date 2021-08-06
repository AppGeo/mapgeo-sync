import { helper } from '@ember/component/helper';
let intl = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'long',
});

type DateStyle = 'full' | 'long' | 'medium' | 'short' | undefined;

export function formatDate(
  [date]: [Date | string],
  {
    dateFormat,
    timeFormat,
  }: {
    dateFormat?: DateStyle;
    timeFormat?: DateStyle;
  } = {}
) {
  if (!date) {
    return '';
  }
  if (dateFormat || timeFormat) {
    intl = new Intl.DateTimeFormat('en-US', {
      dateStyle: dateFormat || 'full',
      timeStyle: timeFormat || 'long',
    });
  }
  return intl.format(new Date(date)).trim();
}

export default helper(formatDate);
