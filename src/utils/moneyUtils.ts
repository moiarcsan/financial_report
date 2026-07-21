/**
 * Utilities for parsing and formatting monetary amounts safely using integer cents.
 */

/**
 * Parses any numeric or string representation of a monetary amount into integer cents.
 * Handles both Spanish style (comma decimal, optional dot thousands) and US style.
 * Returns null if the value cannot be parsed.
 */
export function parseAmountToCents(amountInput: any): number | null {
  if (amountInput === null || amountInput === undefined || amountInput === "") {
    return null;
  }

  if (typeof amountInput === "number") {
    if (isNaN(amountInput)) return null;
    return Math.round(amountInput * 100);
  }

  let str = String(amountInput).trim();
  if (!str) return null;

  // Remove whitespace characters inside the number
  str = str.replace(/\s/g, "");

  const hasComma = str.includes(",");
  const hasDot = str.includes(".");

  if (hasComma && hasDot) {
    const lastCommaIndex = str.lastIndexOf(",");
    const lastDotIndex = str.lastIndexOf(".");
    if (lastCommaIndex > lastDotIndex) {
      // Spanish style: e.g., "1.234,56" or "-1.234,56"
      // Remove all dots, then replace comma with dot
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // US style: e.g., "1,234.56" or "-1,234.56"
      // Remove all commas
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only comma: assumed as decimal separator (e.g. "10,25" or "-5,10")
    str = str.replace(/,/g, ".");
  } else {
    // Only dot or no separator (e.g. "1000.50", "-5.10", "100")
    // Keep as is, JS parseFloat understands it.
  }

  const parsed = parseFloat(str);
  if (isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer cents back to a float number of Euros.
 */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Formats integer cents into a Spanish locale currency string (e.g., "1.234,56 €").
 */
export function formatCentsToEuro(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(euros);
}
