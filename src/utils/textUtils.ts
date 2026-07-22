/**
 * Utilities for cleaning and normalizing text.
 */

export function cleanText(text: string): string {
  if (text === null || text === undefined) return "";
  return String(text).trim().replace(/\s+/g, " ");
}

export function normalizeTextForHash(text: string): string {
  return cleanText(text).toLowerCase();
}

export function normalizeAccount(account: string): string {
  if (account === null || account === undefined) return "";
  // Eliminate spaces but keep other characters intact
  return String(account).replace(/\s/g, "");
}

export function normalizeAccountOwnerToAlias(ownerName: string): string {
  const normalized = cleanText(String(ownerName || "")).toLowerCase();

  if (normalized.includes("moisés") || normalized.includes("moises") || normalized.includes("moi")) {
    return "Cuenta Moi";
  }

  if (normalized.includes("manuel") || normalized.includes("manu")) {
    return "Cuenta Manu";
  }

  return cleanText(String(ownerName || ""));
}
