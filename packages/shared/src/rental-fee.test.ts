import { describe, expect, it } from 'vitest';
import { billableDays, calculateRentalFee, MS_PER_DAY, roundCurrency } from './rental-fee';

const start = new Date('2026-01-01T10:00:00Z');
const after = (ms: number) => new Date(start.getTime() + ms);

describe('billableDays', () => {
  it('bills a minimum of one day, even for an immediate return', () => {
    expect(billableDays(start, start)).toBe(1);
    expect(billableDays(start, after(60_000))).toBe(1);
  });

  it('counts any started day as a full day', () => {
    expect(billableDays(start, after(MS_PER_DAY))).toBe(1);
    expect(billableDays(start, after(MS_PER_DAY + 1))).toBe(2);
    expect(billableDays(start, after(3 * MS_PER_DAY))).toBe(3);
  });

  it('accepts ISO strings', () => {
    expect(billableDays('2026-01-01T00:00:00Z', '2026-01-05T00:00:00Z')).toBe(4);
  });
});

describe('calculateRentalFee', () => {
  it('multiplies billable days by the daily rate', () => {
    expect(calculateRentalFee(start, after(3 * MS_PER_DAY), 2)).toBe(6);
  });

  it('rounds to cents', () => {
    expect(calculateRentalFee(start, after(3 * MS_PER_DAY), 0.1)).toBe(0.3);
    expect(roundCurrency(1.005)).toBe(1.01);
  });
});
