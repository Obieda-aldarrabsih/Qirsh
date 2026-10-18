import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseAmount,
  formatAmount,
  splitAmount,
  getCurrencyExponent,
  isSupportedCurrency,
  MoneyError,
} from '../../src/lib/money.js';

describe('Money arithmetic unit tests', () => {
  it('correctly maps currency exponents', () => {
    expect(getCurrencyExponent('JOD')).toBe(3);
    expect(getCurrencyExponent('USD')).toBe(2);
    expect(getCurrencyExponent('JPY')).toBe(0);
    expect(isSupportedCurrency('JOD')).toBe(true);
    expect(isSupportedCurrency('XYZ')).toBe(false);
  });

  it('parses JOD decimal strings into minor units (fils)', () => {
    expect(parseAmount('15.25', 'JOD')).toBe(15250n);
    expect(parseAmount('15.250', 'JOD')).toBe(15250n);
    expect(parseAmount('0.005', 'JOD')).toBe(5n);
    expect(parseAmount('100', 'JOD')).toBe(100000n);
  });

  it('parses USD decimal strings into minor units (cents)', () => {
    expect(parseAmount('15.25', 'USD')).toBe(1525n);
    expect(parseAmount('0.99', 'USD')).toBe(99n);
    expect(parseAmount('100', 'USD')).toBe(10000n);
  });

  it('parses JPY (0 decimals)', () => {
    expect(parseAmount('500', 'JPY')).toBe(500n);
  });

  it('rejects amounts exceeding decimal precision without silent rounding', () => {
    // JOD allows at most 3 decimals
    expect(() => parseAmount('15.2505', 'JOD')).toThrow(MoneyError);
    try {
      parseAmount('15.2505', 'JOD');
    } catch (err: any) {
      expect(err.code).toBe('INVALID_AMOUNT_PRECISION');
    }

    // USD allows at most 2 decimals
    expect(() => parseAmount('15.255', 'USD')).toThrow(MoneyError);
    // JPY allows 0 decimals
    expect(() => parseAmount('15.5', 'JPY')).toThrow(MoneyError);
  });

  it('rejects negative amounts and zero', () => {
    expect(() => parseAmount('-10.00', 'JOD')).toThrow(MoneyError);
    expect(() => parseAmount('0.000', 'JOD')).toThrow(MoneyError);
  });

  it('formats minor units to decimal strings accurately', () => {
    expect(formatAmount(15250n, 'JOD')).toBe('15.250');
    expect(formatAmount(5n, 'JOD')).toBe('0.005');
    expect(formatAmount(1525n, 'USD')).toBe('15.25');
    expect(formatAmount(500n, 'JPY')).toBe('500');
  });

  it('splits amounts without losing single minor units (parts sum strictly equals total)', () => {
    // 100 fils split into 3 parts: [34, 33, 33] -> sum is 100
    const parts = splitAmount(100n, 3);
    expect(parts).toEqual([34n, 33n, 33n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(100n);

    // 1000 fils split into 7 parts
    const parts7 = splitAmount(1000n, 7);
    expect(parts7.length).toBe(7);
    expect(parts7.reduce((a, b) => a + b, 0n)).toBe(1000n);
  });

  // Property-based test with fast-check:
  it('Property: splitAmount parts always sum to the original total for any amount and parts', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10_000_000_000n }),
        fc.integer({ min: 1, max: 100 }),
        (amount, numParts) => {
          const parts = splitAmount(amount, numParts);
          expect(parts.length).toBe(numParts);
          const sum = parts.reduce((acc, curr) => acc + curr, 0n);
          return sum === amount;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property: parseAmount followed by formatAmount preserves numeric value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 999 }),
        (whole, fraction) => {
          const str = `${whole}.${String(fraction).padStart(3, '0')}`;
          const minor = parseAmount(str, 'JOD');
          const formatted = formatAmount(minor, 'JOD');
          return formatted === str;
        }
      ),
      { numRuns: 100 }
    );
  });
});
