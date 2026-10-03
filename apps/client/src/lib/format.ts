import { MS_PER_DAY } from '@vidly/shared';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const number = new Intl.NumberFormat('en-US');
const relative = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

export const formatCurrency = (value: number) => currency.format(value);
export const formatNumber = (value: number) => number.format(value);
export const formatDate = (value: string | Date) => date.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value));

/** "today", "yesterday", "3 days ago"… */
export function formatRelativeDays(value: string | Date, now = Date.now()) {
  const days = Math.round((new Date(value).getTime() - now) / MS_PER_DAY);
  return relative.format(days, 'day');
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${formatNumber(count)} ${count === 1 ? singular : plural}`;
