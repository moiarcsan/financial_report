import { normalizeTextForHash, normalizeAccount } from "../utils/textUtils";

/**
 * Builds the canonical string representation of a movement for fingerprinting.
 */
export function buildFingerprintInput(
  bank: string,
  account: string,
  operationDate: string,
  valueDate: string | null,
  concept: string,
  amount: number
): string {
  // 1. Banco (N26 | Unicaja | Sabadell)
  const normBank = normalizeTextForHash(bank);

  // 2. Cuenta (space normalized, remove spaces entirely)
  const normAccount = normalizeAccount(account).toLowerCase();

  // 3. Fecha de operación (YYYY-MM-DD)
  const normOpDate = operationDate;

  // 4. Fecha valor (YYYY-MM-DD or empty string)
  const normValDate = valueDate || "";

  // 5. Concepto (normalized spaces, lowercase)
  const normConcept = normalizeTextForHash(concept);

  // 6. Importe (normalized always to 2 decimal places, e.g., "1025.00", "-5.10")
  const normAmount = amount.toFixed(2);

  // Concatenate with a pipe delimiter to prevent field boundary collisions
  return [normBank, normAccount, normOpDate, normValDate, normConcept, normAmount].join("|");
}

/**
 * Generates a SHA-256 hash string from a text input using the native Web Crypto API.
 */
export async function generateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * High-level function to generate a stable fingerprint for a movement.
 */
export async function getMovementFingerprint(
  bank: string,
  account: string,
  operationDate: string,
  valueDate: string | null,
  concept: string,
  amount: number
): Promise<string> {
  const rawInput = buildFingerprintInput(bank, account, operationDate, valueDate, concept, amount);
  return await generateSHA256(rawInput);
}
