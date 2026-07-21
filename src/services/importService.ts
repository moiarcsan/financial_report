import * as XLSX from "xlsx";
import { db } from "../database/database";
import { getMovementFingerprint } from "./fingerprintService";
import { detectBankFormat } from "../parsers/parserDetector";
import { parseN26 } from "../parsers/n26Parser";
import { parseUnicaja } from "../parsers/unicajaParser";
import { parseSabadell } from "../parsers/sabadellParser";
import { type BankMovement, type FileImportResult, type GlobalImportResult } from "../types/movement";

/**
 * Reads a File into a SheetJS WorkBook object.
 */
function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        resolve(workbook);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Processes a single bank statement file, performs validation, and persists new records.
 */
export async function processFile(file: File): Promise<FileImportResult> {
  const result: FileImportResult = {
    fileName: file.name,
    bankDetected: "Desconocido",
    status: "error",
    movementsRead: 0,
    movementsNew: 0,
    movementsDuplicated: 0,
    netSumCents: 0,
    discardedRows: 0,
  };

  try {
    const workbook = await readWorkbook(file);
    if (workbook.SheetNames.length === 0) {
      result.errorDetails = `El fichero está vacío o no contiene hojas válidas.`;
      return result;
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];

    // Detect format
    const bank = detectBankFormat(sheet);
    if (!bank) {
      result.errorDetails = `No se ha podido reconocer el formato bancario del fichero ${file.name}.`;
      return result;
    }
    result.bankDetected = bank;

    // Run the corresponding parser
    let parseResult;
    if (bank === "N26") {
      parseResult = parseN26(sheet, file.name);
    } else if (bank === "Unicaja") {
      parseResult = parseUnicaja(sheet, file.name);
    } else if (bank === "Sabadell") {
      parseResult = parseSabadell(sheet, file.name);
    } else {
      result.errorDetails = `No se pudo encontrar un parser para el banco detectado: ${bank}.`;
      return result;
    }

    result.movementsRead = parseResult.movementsReadCount;
    result.discardedRows = parseResult.discardedRowsCount;
    result.netSumCents = parseResult.parsedSumCents;

    // Accounting validation (Section 11)
    // Compare parsed cents sum vs original cents sum
    const originalSumCents = parseResult.originalSumCents;
    const parsedSumCents = parseResult.parsedSumCents;

    if (originalSumCents !== parsedSumCents) {
      result.status = "error";
      result.errorDetails = `La suma de los movimientos transformados no coincide con la suma del fichero original.`;
      return result;
    }

    // Hash generation & duplicate check
    const movementsToSave: BankMovement[] = [];
    let newCount = 0;
    let dupCount = 0;

    for (const mov of parseResult.movements) {
      const fingerprint = await getMovementFingerprint(
        mov.bank,
        mov.account,
        mov.operationDate,
        mov.valueDate,
        mov.concept,
        mov.amount
      );

      // Check if it already exists in IndexedDB
      const existing = await db.movements.get(fingerprint);
      if (existing) {
        dupCount++;
      } else {
        newCount++;
        movementsToSave.push({
          ...mov,
          id: fingerprint,
          fingerprint,
          importedAt: new Date().toISOString(),
        });
      }
    }

    result.movementsNew = newCount;
    result.movementsDuplicated = dupCount;

    // Save only if validation passes and there are new items
    if (movementsToSave.length > 0) {
      await db.movements.bulkAdd(movementsToSave);
    }

    result.status = "success";
  } catch (err: any) {
    result.status = "error";
    result.errorDetails = err?.message || String(err);
  }

  return result;
}

/**
 * Processes multiple uploaded files sequentially and returns the total results.
 */
export async function processMultipleFiles(files: File[]): Promise<GlobalImportResult> {
  const fileResults: FileImportResult[] = [];
  
  for (const file of files) {
    const res = await processFile(file);
    fileResults.push(res);
  }

  const totalFiles = files.length;
  const totalSuccess = fileResults.filter((r) => r.status === "success").length;
  const totalErrors = fileResults.filter((r) => r.status === "error").length;

  // Let's sum read, new, duplicates, and net sum from successful files only (since errored files are not imported)
  const totalRead = fileResults.reduce((acc, r) => acc + (r.status === "success" ? r.movementsRead : 0), 0);
  const totalNew = fileResults.reduce((acc, r) => acc + (r.status === "success" ? r.movementsNew : 0), 0);
  const totalDuplicated = fileResults.reduce((acc, r) => acc + (r.status === "success" ? r.movementsDuplicated : 0), 0);
  const totalNetSumCents = fileResults.reduce((acc, r) => acc + (r.status === "success" ? r.netSumCents : 0), 0);

  return {
    files: fileResults,
    totalFiles,
    totalSuccess,
    totalErrors,
    totalRead,
    totalNew,
    totalDuplicated,
    totalNetSumCents,
  };
}
