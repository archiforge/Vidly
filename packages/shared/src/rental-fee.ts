export const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toTime = (value: Date | string | number) => new Date(value).getTime();

/**
 * Number of billable days for a rental. Any started day counts as a full day,
 * and every rental is billed for at least one day.
 */
export function billableDays(
  dateOut: Date | string | number,
  dateReturned: Date | string | number,
) {
  const elapsed = toTime(dateReturned) - toTime(dateOut);
  return Math.max(1, Math.ceil(elapsed / MS_PER_DAY));
}

/** Rounds a currency amount to cents, avoiding binary floating point drift (e.g. 1.005). */
export function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateRentalFee(
  dateOut: Date | string | number,
  dateReturned: Date | string | number,
  dailyRentalRate: number,
) {
  return roundCurrency(billableDays(dateOut, dateReturned) * dailyRentalRate);
}
