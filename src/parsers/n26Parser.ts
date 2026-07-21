import * as XLSX from "xlsx";
import { type BankMovement } from "../types/movement";
import { parseAnyDate } from "../utils/dateUtils";
import { parseAmountToCents } from "../utils/moneyUtils";
import { cleanText } from "../utils/textUtils";

export interface ParserOutput {
  bank: "N26" | "Unicaja" | "Sabadell";
  movements: Omit<BankMovement, "id" | "fingerprint" | "importedAt">[];
  movementsReadCount: number;
  discardedRowsCount: number;
  originalSumCents: number;
  parsedSumCents: number;
}

/**
 * Parses an N26 CSV sheet.
 */
export function parseN26(sheet: XLSX.WorkSheet, sourceFileName: string): ParserOutput {
  // Convert sheet to array of arrays to handle raw row access safely
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: "" });
  
  if (rows.length < 2) {
    return {
      bank: "N26",
      movements: [],
      movementsReadCount: 0,
      discardedRowsCount: 0,
      originalSumCents: 0,
      parsedSumCents: 0,
    };
  }

  // First row has the headers
  const headers = rows[0].map(h => String(h).trim());
  
  // Find column indices
  const idxBookingDate = headers.indexOf("Booking Date");
  const idxValueDate = headers.indexOf("Value Date");
  const idxPartnerName = headers.indexOf("Partner Name");
  const idxType = headers.indexOf("Type");
  const idxPaymentReference = headers.indexOf("Payment Reference");
  const idxAccountName = headers.indexOf("Account Name");
  const idxAmount = headers.indexOf("Amount (EUR)");

  let originalSumCents = 0;
  let parsedSumCents = 0;
  let discardedRowsCount = 0;
  let movementsReadCount = 0;
  const movements: Omit<BankMovement, "id" | "fingerprint" | "importedAt">[] = [];

  // Iterate from row index 1 onwards
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip completely empty rows
    if (!row || row.every(cell => cell === "")) {
      continue;
    }

    const rawBookingDate = idxBookingDate !== -1 ? row[idxBookingDate] : "";
    const rawValueDate = idxValueDate !== -1 ? row[idxValueDate] : "";
    const rawPartnerName = idxPartnerName !== -1 ? row[idxPartnerName] : "";
    const rawType = idxType !== -1 ? row[idxType] : "";
    const rawPaymentReference = idxPaymentReference !== -1 ? row[idxPaymentReference] : "";
    const rawAccountName = idxAccountName !== -1 ? row[idxAccountName] : "";
    const rawAmount = idxAmount !== -1 ? row[idxAmount] : "";

    // Parse the fields
    const parsedOpDate = parseAnyDate(rawBookingDate);
    const parsedValDate = parseAnyDate(rawValueDate);
    const amountCents = parseAmountToCents(rawAmount);

    movementsReadCount++;

    // Validation: Si una fila no tiene fecha o importe válido, se ignora
    if (!parsedOpDate || amountCents === null) {
      discardedRowsCount++;
      // If we could parse the amount but date is missing, let's still add to originalSumCents
      // because page 8 says: "Calcular la suma de todos los importes válidos leídos del fichero."
      if (amountCents !== null) {
        originalSumCents += amountCents;
      }
      continue;
    }

    // Accumulate in original reading
    originalSumCents += amountCents;

    // Map fields
    const account = cleanText(String(rawAccountName || "N26"));
    
    // Concept: partner name, payment reference, and type joined legibly
    const conceptParts = [
      cleanText(String(rawPartnerName)),
      cleanText(String(rawPaymentReference)),
      cleanText(String(rawType))
    ].filter(p => p !== "");
    
    const concept = conceptParts.join(" · ") || "Sin concepto";

    movements.push({
      bank: "N26",
      account,
      operationDate: parsedOpDate,
      valueDate: parsedValDate,
      concept,
      amount: amountCents / 100,
      currency: "EUR",
      sourceFileName,
    });

    parsedSumCents += amountCents;
  }

  return {
    bank: "N26",
    movements,
    movementsReadCount,
    discardedRowsCount,
    originalSumCents,
    parsedSumCents,
  };
}
