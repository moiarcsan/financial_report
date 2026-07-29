import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { getMovementFingerprint } from "./fingerprintService";
import { detectBankFormat } from "../parsers/parserDetector";
import { parseN26 } from "../parsers/n26Parser";
import { parseUnicaja } from "../parsers/unicajaParser";
import { parseSabadell } from "../parsers/sabadellParser";
import { type BankMovement, type FileImportResult, type GlobalImportResult } from "../types/movement";

export function getImportedSourceFileNames(movements: Pick<BankMovement, "sourceFileName">[]): string[] {
  return Array.from(new Set(movements.map((movement) => movement.sourceFileName?.trim()).filter(Boolean))) as string[];
}

/**
 * Saves movements to Supabase using upsert.
 * Uses the fingerprint as the id (primary key) for native duplicate handling.
 */
async function saveMovementsToSupabase(userId: string, movements: BankMovement[]): Promise<void> {
  if (userId === undefined || userId === null) {
    console.error("[saveMovementsToSupabase] Error: userId es undefined o null. No se puede ejecutar la query de Supabase.");
    return;
  }

  const supabaseMovementsRaw = movements.map((m) => ({
    id: m.fingerprint,
    user_id: userId,
    bank: m.bank,
    account: m.account,
    operation_date: m.operationDate,
    value_date: m.valueDate,
    concept: m.concept,
    amount: m.amount,
    currency: m.currency,
    source_file_name: m.sourceFileName,
    imported_at: m.importedAt,
    // DO NOT include assigned_category here - it would overwrite existing manual assignments
    // assigned_category will only be set when user manually assigns it
  }));

  // Deduplicate by id to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const seen = new Set<string>();
  const supabaseMovements = supabaseMovementsRaw.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  // El upsert inserta los nuevos y actualiza/ignora los existentes basados en la clave primaria (id/fingerprint)
  const { error } = await supabase.from("movements").upsert(supabaseMovements, {
    onConflict: "id",
  });
  
  if (error) throw error;
}

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
 * Processes a single bank statement file, performs validation, and persists records to Supabase.
 * @param file - The file to process
 * @param userId - The user ID for Supabase (optional, for cloud sync)
 */
export async function processFile(
  file: File,
  userId?: string
): Promise<FileImportResult> {
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

    // Accounting validation
    const originalSumCents = parseResult.originalSumCents;
    const parsedSumCents = parseResult.parsedSumCents;

    if (originalSumCents !== parsedSumCents) {
      result.status = "error";
      result.errorDetails = `La suma de los movimientos transformados no coincide con la suma del fichero original.`;
      return result;
    }

    // Hash generation
    const movementsToSave: BankMovement[] = [];

    for (const mov of parseResult.movements) {
      const fingerprint = await getMovementFingerprint(
        mov.bank,
        mov.account,
        mov.operationDate,
        mov.valueDate,
        mov.concept,
        mov.amount
      );

      movementsToSave.push({
        ...mov,
        id: fingerprint,
        fingerprint,
        importedAt: new Date().toISOString(),
      });
    }

    // Métricas globales para el resultado
    result.movementsNew = movementsToSave.length;
    result.movementsDuplicated = 0; // Al usar upsert nativo, dejamos el conteo directo o lo gestionamos a nivel de bloque

    // Save to Supabase if userId is provided and there are items
    if (movementsToSave.length > 0 && userId) {
      await saveMovementsToSupabase(userId, movementsToSave);
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
 * @param files - The files to process
 * @param userId - The user ID for Supabase (optional, for cloud sync)
 */
export async function processMultipleFiles(
  files: File[],
  userId?: string
): Promise<GlobalImportResult> {
  const fileResults: FileImportResult[] = [];
  
  for (const file of files) {
    const res = await processFile(file, userId);
    fileResults.push(res);
  }

  const totalFiles = files.length;
  const totalSuccess = fileResults.filter((r) => r.status === "success").length;
  const totalErrors = fileResults.filter((r) => r.status === "error").length;

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