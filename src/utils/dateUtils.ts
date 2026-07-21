/**
 * Utilities for parsing and formatting dates.
 */

/**
 * Formats a JavaScript Date object into ISO YYYY-MM-DD format.
 */
export function formatJSDateToISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses an Excel numeric serial date (days since 1900-01-01) into ISO YYYY-MM-DD format.
 */
export function parseExcelSerialDate(serial: number): string | null {
  if (serial < 1 || isNaN(serial)) return null;
  let days = serial;
  
  // Excel leap year bug: Excel falsely assumes 1900 was a leap year.
  // Day 60 is Feb 29, 1900, which is incorrect.
  if (days === 60) {
    return "1900-02-28";
  }
  if (days > 60) {
    days -= 1;
  }

  // Base date in JS is Jan 1, 1900
  const baseDate = new Date(1900, 0, 1);
  baseDate.setDate(baseDate.getDate() + (days - 1));
  
  return formatJSDateToISO(baseDate);
}

/**
 * Parses a date string of various formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY) into ISO YYYY-MM-DD.
 */
export function parseDateString(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Pattern 1: ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, "0");
    const dd = isoMatch[3].padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Pattern 2: DD/MM/YYYY or MM/DD/YYYY (or with hyphens)
  const dmyMatch = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];

    // If the second part is > 12, it must be MM/DD/YYYY
    if (p2 > 12) {
      const mm = String(p1).padStart(2, "0");
      const dd = String(p2).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    } else {
      // Default to Spanish standard DD/MM/YYYY
      const dd = String(p1).padStart(2, "0");
      const mm = String(p2).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  return null;
}

/**
 * Master parser that handles JS Date objects, Excel numbers, or date strings.
 */
export function parseAnyDate(val: any): string | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return formatJSDateToISO(val);
  }

  if (typeof val === "number") {
    return parseExcelSerialDate(val);
  }

  const str = String(val).trim();
  if (!str) return null;

  // If string contains only digits, it's an Excel serial disguised as string
  if (/^\d+$/.test(str)) {
    return parseExcelSerialDate(parseInt(str, 10));
  }

  return parseDateString(str);
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Spanish display format (DD/MM/YYYY).
 */
export function formatDateToSpanish(isoDate: string | null): string {
  if (!isoDate) return "-";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
