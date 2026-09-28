export function formatMoney(
  minor: number,
  currency: string,
  digits: number,
  locale = "en-IN",
) {
  if (!Number.isSafeInteger(minor))
    throw new Error("Money must be safe integer minor units");
  if (!Number.isInteger(digits) || digits < 0 || digits > 3)
    throw new Error("Invalid currency precision");
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / 10 ** digits);
}
export function averageBill(netMinor: number, count: number) {
  if (
    !Number.isSafeInteger(netMinor) ||
    !Number.isSafeInteger(count) ||
    count < 0
  )
    throw new Error("Invalid money or sale count");
  return count === 0 ? null : Math.round(netMinor / count);
}
