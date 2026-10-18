/**
 * Money arithmetic without floating point rounding bugs.
 * Every fils accounted for.
 */

export const CURRENCY_EXPONENTS: Record<string, number> = {
  JOD: 3, // Jordan Dinar (1 JOD = 1,000 fils)
  KWD: 3, // Kuwaiti Dinar
  BHD: 3, // Bahraini Dinar
  OMR: 3, // Omani Rial
  USD: 2, // US Dollar (1 USD = 100 cents)
  EUR: 2, // Euro
  GBP: 2, // British Pound
  SAR: 2, // Saudi Riyal
  AED: 2, // UAE Dirham
  JPY: 0, // Japanese Yen (0 decimals)
};

export class MoneyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 422
  ) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Checks if a currency code is supported (ISO 4217 uppercase).
 */
export function isSupportedCurrency(currency: string): boolean {
  return currency.toUpperCase() in CURRENCY_EXPONENTS;
}

/**
 * Returns the exponent (number of decimal places) for a currency.
 */
export function getCurrencyExponent(currency: string): number {
  const norm = currency.toUpperCase();
  if (!(norm in CURRENCY_EXPONENTS)) {
    throw new MoneyError('UNSUPPORTED_CURRENCY', `Currency '${currency}' is not supported. Supported: ${Object.keys(CURRENCY_EXPONENTS).join(', ')}`);
  }
  return CURRENCY_EXPONENTS[norm];
}

/**
 * Parses a decimal string or numeric amount into integer minor units (bigint).
 * Strictly validates decimal precision: rejects any extra decimals without silent rounding.
 * Rejects negative amounts and zero.
 * 
 * Example:
 *   parseAmount("15.25", "JOD") -> 15250n
 *   parseAmount("15.2505", "JOD") -> throws MoneyError('INVALID_AMOUNT_PRECISION')
 */
export function parseAmount(input: string | number | bigint, currency: string): bigint {
  const exponent = getCurrencyExponent(currency);

  if (typeof input === 'bigint') {
    if (input <= 0n) {
      throw new MoneyError('INVALID_AMOUNT', 'Amount must be greater than zero.');
    }
    return input;
  }

  const str = String(input).trim();
  if (!str) {
    throw new MoneyError('INVALID_AMOUNT', 'Amount cannot be empty.');
  }

  // Check valid numeric format (optional positive sign, digits, optional single decimal point)
  if (!/^\+?\d+(\.\d+)?$/.test(str)) {
    throw new MoneyError('INVALID_AMOUNT', `Invalid amount format '${str}'. Must be a positive decimal number.`);
  }

  const parts = str.replace(/^\+/, '').split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  if (decimalPart.length > exponent) {
    throw new MoneyError(
      'INVALID_AMOUNT_PRECISION',
      `Amount '${str}' exceeds maximum allowed precision of ${exponent} decimal places for ${currency.toUpperCase()}.`
    );
  }

  // Pad decimal part with trailing zeros up to exponent
  const paddedDecimal = decimalPart.padEnd(exponent, '0');
  const combined = integerPart + paddedDecimal;
  const minor = BigInt(combined);

  if (minor <= 0n) {
    throw new MoneyError('INVALID_AMOUNT', 'Amount must be greater than zero.');
  }

  return minor;
}

/**
 * Formats integer minor units into a human-readable decimal string.
 * Example:
 *   formatAmount(15250n, "JOD") -> "15.250"
 *   formatAmount(150n, "USD") -> "1.50"
 *   formatAmount(500n, "JPY") -> "500"
 */
export function formatAmount(amountMinor: bigint | number, currency: string): string {
  const exponent = getCurrencyExponent(currency);
  const minor = BigInt(amountMinor);
  const isNegative = minor < 0n;
  const absMinor = isNegative ? -minor : minor;

  if (exponent === 0) {
    return (isNegative ? '-' : '') + absMinor.toString();
  }

  const divisor = 10n ** BigInt(exponent);
  const whole = absMinor / divisor;
  const fraction = absMinor % divisor;
  const fractionStr = fraction.toString().padStart(exponent, '0');

  return `${isNegative ? '-' : ''}${whole}.${fractionStr}`;
}

/**
 * Splits an amount into N parts deterministically distributing any remainder
 * one minor unit at a time to the first parts.
 * The sum of the returned parts is GUARANTEED to strictly equal amountMinor.
 * 
 * Example:
 *   splitAmount(100n, 3) -> [34n, 33n, 33n] (sum is 100n)
 */
export function splitAmount(amountMinor: bigint, parts: number): bigint[] {
  if (parts <= 0 || !Number.isInteger(parts)) {
    throw new MoneyError('INVALID_PARTS', 'Parts must be a positive integer >= 1.');
  }

  const n = BigInt(parts);
  const base = amountMinor / n;
  const remainder = Number(amountMinor % n);

  const result: bigint[] = [];
  for (let i = 0; i < parts; i++) {
    result.push(base + (i < remainder ? 1n : 0n));
  }

  return result;
}
