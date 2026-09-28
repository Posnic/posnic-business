import { getFormatLocale } from "../i18n";

/** Keep integer thousandths exact even near MAX_SAFE_INTEGER. */
export function formatQuantity(milli: number, locale = getFormatLocale()) {
  if (!Number.isSafeInteger(milli) || milli < 0)
    throw new Error("Invalid quantity");
  const whole = BigInt(milli) / 1000n;
  const fraction = String(BigInt(milli) % 1000n)
    .padStart(3, "0")
    .replace(/0+$/, "");
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  if (!fraction) return formatter.format(whole);
  const separator = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === "decimal")!.value;
  return (
    formatter.format(whole) +
    separator +
    new Intl.NumberFormat(locale, {
      useGrouping: false,
      minimumIntegerDigits: fraction.length,
      maximumFractionDigits: 0,
    }).format(Number(fraction))
  );
}
