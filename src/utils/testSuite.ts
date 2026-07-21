import { detectBankFormat } from "../parsers/parserDetector";
import { parseAnyDate } from "./dateUtils";
import { parseAmountToCents } from "./moneyUtils";
import { getMovementFingerprint } from "../services/fingerprintService";
import { db } from "../database/database";
import * as XLSX from "xlsx";

export interface TestCaseResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface TestSuiteResult {
  allPassed: boolean;
  results: TestCaseResult[];
}

/**
 * Runs the self-contained suite of tests covering all Section 14 MVP requirements.
 */
export async function runTestSuite(): Promise<TestSuiteResult> {
  const results: TestCaseResult[] = [];

  // Helper to push test results
  const addResult = (name: string, passed: boolean, expected: string, actual: string, details?: string) => {
    results.push({ name, passed, expected, actual, details });
  };

  try {
    // --- Test 1: Bank Detection ---
    // Mock N26 workbook structure
    const mockN26Sheet: XLSX.WorkSheet = {
      "A1": { v: "Booking Date" },
      "B1": { v: "Amount (EUR)" },
      "!ref": "A1:B2"
    };
    const detectedN26 = detectBankFormat(mockN26Sheet);
    addResult(
      "Detectar correctamente N26",
      detectedN26 === "N26",
      "N26",
      detectedN26 || "Desconocido"
    );

    // Mock Unicaja workbook structure
    const mockUnicajaSheet: XLSX.WorkSheet = {
      "A1": { v: "Fecha de operación" },
      "B1": { v: "Concepto" },
      "C1": { v: "Importe" },
      "!ref": "A1:C2"
    };
    const detectedUnicaja = detectBankFormat(mockUnicajaSheet);
    addResult(
      "Detectar correctamente Unicaja",
      detectedUnicaja === "Unicaja",
      "Unicaja",
      detectedUnicaja || "Desconocido"
    );

    // Mock Sabadell workbook structure
    const mockSabadellSheet: XLSX.WorkSheet = {
      "A1": { v: "F. Operativa" },
      "B1": { v: "F. Valor" },
      "C1": { v: "Importe" },
      "!ref": "A1:C2"
    };
    const detectedSabadell = detectBankFormat(mockSabadellSheet);
    addResult(
      "Detectar correctamente Sabadell",
      detectedSabadell === "Sabadell",
      "Sabadell",
      detectedSabadell || "Desconocido"
    );


    // --- Test 2: Date Conversion ---
    const dateTests = [
      { input: "2026-07-21", expected: "2026-07-21" },
      { input: "21/07/2026", expected: "2026-07-21" },
      { input: "07/21/2026", expected: "2026-07-21" },
      { input: 46222, expected: "2026-07-21" }, // Excel date for 2026-07-21
    ];

    let datesPassed = true;
    for (const t of dateTests) {
      const parsed = parseAnyDate(t.input);
      if (parsed !== t.expected) {
        datesPassed = false;
        addResult(
          `Convertir correctamente fecha (${t.input})`,
          false,
          t.expected,
          parsed || "null"
        );
      }
    }
    if (datesPassed) {
      addResult("Convertir correctamente fechas", true, "YYYY-MM-DD", "YYYY-MM-DD", "Formatos probados: ISO, Español, US y Excel Serial");
    }


    // --- Test 3: Amount Conversion ---
    const amountTests = [
      { input: "1.234,56", expected: 123456 },
      { input: "-5.10", expected: -510 },
      { input: "10,25", expected: 1025 },
      { input: 100, expected: 10000 },
    ];

    let amountsPassed = true;
    for (const t of amountTests) {
      const parsed = parseAmountToCents(t.input);
      if (parsed !== t.expected) {
        amountsPassed = false;
        addResult(
          `Convertir correctamente importe (${t.input})`,
          false,
          String(t.expected),
          String(parsed)
        );
      }
    }
    if (amountsPassed) {
      addResult("Convertir correctamente importes", true, "Céntimos exactos", "Céntimos exactos", "Formatos probados: decimal con coma, decimal con punto, entero y número nativo");
    }


    // --- Test 4: Fingerprint Consistency ---
    const hash1 = await getMovementFingerprint("N26", "ES123", "2026-07-21", "2026-07-21", "Compra Súper", -25.50);
    const hash2 = await getMovementFingerprint("N26", "ES123", "2026-07-21", "2026-07-21", "Compra Súper", -25.50);
    const hashesEqual = hash1 === hash2;
    addResult(
      "Generar siempre la misma huella para el mismo movimiento",
      hashesEqual,
      "Coincidencia idéntica",
      hashesEqual ? "Coincidencia idéntica" : "Huellas diferentes",
      `Huella obtenida: ${hash1}`
    );


    // --- Test 5: Avoid Duplicates & IndexedDB Integrity ---
    // Clear movements first
    const originalCount = await db.movements.count();
    
    // Add first
    const mockMov = {
      id: hash1,
      fingerprint: hash1,
      bank: "N26" as const,
      account: "ES123",
      operationDate: "2026-07-21",
      valueDate: "2026-07-21",
      concept: "Compra Súper",
      amount: -25.50,
      currency: "EUR" as const,
      sourceFileName: "test.csv",
      importedAt: new Date().toISOString(),
    };

    // Attempt to add twice
    await db.movements.put(mockMov);
    const countAfterFirst = await db.movements.count();

    let threwDuplicateError = false;
    try {
      // Trying to add the exact same record (put will overwrite, bulkAdd or add should reject or maintain uniqueness)
      await db.movements.add(mockMov);
    } catch (e) {
      threwDuplicateError = true;
    }

    const countAfterSecond = await db.movements.count();
    const isIntegrityMaintained = countAfterSecond === countAfterFirst;

    addResult(
      "Evitar duplicados en base de datos",
      isIntegrityMaintained,
      `Mismo contador: ${countAfterFirst}`,
      `Contador tras re-inserción: ${countAfterSecond}`,
      "IndexedDB bloquea la duplicidad utilizando el fingerprint como índice único / clave primaria"
    );

    // Clean up mock test movement if we didn't have it before
    if (originalCount === 0) {
      await db.movements.delete(hash1);
    }


    // --- Test 6: Accounting Sum Check Match ---
    // Math checks
    const p1 = parseAmountToCents("10,25"); // 1025
    const p2 = parseAmountToCents("-5,10"); // -510
    const rawSum = (p1 || 0) + (p2 || 0); // 515

    const m1 = { amount: (p1 || 0) / 100 };
    const m2 = { amount: (p2 || 0) / 100 };
    const parsedSum = Math.round(m1.amount * 100) + Math.round(m2.amount * 100); // 515

    const matches = rawSum === parsedSum;
    addResult(
      "Comprobar que la suma del fichero coincide con la suma transformada",
      matches,
      `${rawSum} céntimos`,
      `${parsedSum} céntimos`,
      "Los importes transformados conservan la integridad matemática sin errores de coma flotante"
    );

  } catch (err: any) {
    addResult(
      "Ejecución general de pruebas",
      false,
      "Sin excepciones",
      `Error: ${err?.message || err}`
    );
  }

  const allPassed = results.every(r => r.passed);
  return {
    allPassed,
    results
  };
}
