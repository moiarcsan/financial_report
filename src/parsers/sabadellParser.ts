import * as XLSX from "xlsx";
import { type BankMovement } from "../types/movement";
import { parseAnyDate } from "../utils/dateUtils";
import { parseAmountToCents } from "../utils/moneyUtils";
import { cleanText } from "../utils/textUtils";
import { type ParserOutput } from "./n26Parser";

/**
 * Parses a Sabadell XLS / XLSX sheet.
 */
export function parseSabadell(sheet: XLSX.WorkSheet, sourceFileName: string): ParserOutput {
  // Convert to array of arrays
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: "" });

  if (rows.length === 0) {
    return {
      bank: "Sabadell",
      movements: [],
      movementsReadCount: 0,
      discardedRowsCount: 0,
      originalSumCents: 0,
      parsedSumCents: 0,
    };
  }

  // 1. Locate the Account Number in the informative area above the table
  let account = "Sabadell Account";
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    let found = false;
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c]).trim().toLowerCase();
      if (cellVal === "cuenta:") {
        if (c + 1 < row.length) {
          account = String(row[c + 1]).trim();
        }
        found = true;
        break;
      }
    }
    if (found) break;
  }

  // 2. Locate the header row by searching for a row whose first cell is "F. Operativa"
  let headerRowIndex = -1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row && row.length > 0 && String(row[0]).trim() === "F. Operativa") {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // If not found, cannot parse
    return {
      bank: "Sabadell",
      movements: [],
      movementsReadCount: 0,
      discardedRowsCount: 0,
      originalSumCents: 0,
      parsedSumCents: 0,
    };
  }

  // Column headers
  const headers = rows[headerRowIndex].map(h => String(h).trim());
  const idxOpDate = headers.indexOf("F. Operativa");
  const idxValDate = headers.indexOf("F. Valor");
  const idxConcept = headers.indexOf("Concepto");
  const idxAmount = headers.indexOf("Importe");

  let originalSumCents = 0;
  let parsedSumCents = 0;
  let discardedRowsCount = 0;
  let movementsReadCount = 0;
  const movements: Omit<BankMovement, "id" | "fingerprint" | "importedAt">[] = [];

  // 3. Process rows from headerRowIndex + 1 onwards
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    
    // Ignore completely empty rows
    if (!row || row.every(cell => cell === "")) {
      continue;
    }

    const rawOpDate = idxOpDate !== -1 ? row[idxOpDate] : "";
    const rawValDate = idxValDate !== -1 ? row[idxValDate] : "";
    const rawConcept = idxConcept !== -1 ? row[idxConcept] : "";
    const rawAmount = idxAmount !== -1 ? row[idxAmount] : "";

    const parsedOpDate = parseAnyDate(rawOpDate);
    const parsedValDate = parseAnyDate(rawValDate);
    const amountCents = parseAmountToCents(rawAmount);

    movementsReadCount++;

    // Validation: "Filas sin una fecha operativa válida" are ignored.
    // Also, if amount is not valid, it's ignored and counted as discarded.
    if (!parsedOpDate || amountCents === null) {
      discardedRowsCount++;
      if (amountCents !== null) {
        originalSumCents += amountCents;
      }
      continue;
    }

    originalSumCents += amountCents;

    movements.push({
      bank: "Sabadell",
      account,
      operationDate: parsedOpDate,
      valueDate: parsedValDate,
      concept: cleanText(String(rawConcept)) || "Sin concepto",
      amount: amountCents / 100,
      currency: "EUR",
      sourceFileName,
    });

    parsedSumCents += amountCents;
  }

  return {
    bank: "Sabadell",
    movements,
    movementsReadCount,
    discardedRowsCount,
    originalSumCents,
    parsedSumCents,
  };
}
