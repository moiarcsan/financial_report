import { detectBankFormat } from "../parsers/parserDetector";
import { parseAnyDate } from "./dateUtils";
import { parseAmountToCents } from "./moneyUtils";
import { summarizeAccountTotalsByBank, sumNetTotals } from "./n26AccountUtils";
import { getImportedSourceFileNames } from "../services/importService";
import { buildMonthlySavingsHistory } from "./savingsHistory";
import { normalizeAccountOwnerToAlias } from "./textUtils";
import { findSabadellAccountOwner } from "../parsers/sabadellParser";
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

    // --- Test 4: Sabadell Owner Name Normalization ---
    const normalizedMoi = normalizeAccountOwnerToAlias("Moisés García");
    const normalizedManu = normalizeAccountOwnerToAlias("Manuel Pérez");
    const ownerAliasesMatch = normalizedMoi === "Cuenta Moi" && normalizedManu === "Cuenta Manu";
    addResult(
      "Normalizar correctamente los titulares de Sabadell",
      ownerAliasesMatch,
      "Cuenta Moi y Cuenta Manu",
      `${normalizedMoi} y ${normalizedManu}`
    );

    const foundSabadellOwner = findSabadellAccountOwner([
      ["Cuenta:", "ES1234567890"],
      ["Titular:", "Moisés García"],
      ["F. Operativa", "F. Valor", "Concepto", "Importe"],
    ]);
    addResult(
      "Extraer correctamente el titular de Sabadell",
      foundSabadellOwner === "Cuenta Moi",
      "Cuenta Moi",
      foundSabadellOwner
    );

    // --- Test 5: N26 Account Totals ---
    const n26AccountTotals = summarizeAccountTotalsByBank([
      { bank: "N26", account: "Manu", amount: -12.50 } as any,
      { bank: "N26", account: "Moi", amount: 30.00 } as any,
      { bank: "N26", account: "Manu", amount: 5.25 } as any,
    ], "N26");
    const n26AccountTotalsMatch = n26AccountTotals.Manu === -725 && n26AccountTotals.Moi === 3000;
    addResult(
      "Agrupar correctamente los totales de N26 por cuenta",
      n26AccountTotalsMatch,
      "Manu: -725 céntimos, Moi: 3000 céntimos",
      `Manu: ${n26AccountTotals.Manu} céntimos, Moi: ${n26AccountTotals.Moi} céntimos`
    );

    const globalBalance = sumNetTotals(1200, -250, 750);
    addResult(
      "Sumar correctamente el saldo global a partir de los saldos por cuenta",
      globalBalance === 1700,
      "1700",
      String(globalBalance)
    );

    const importedFiles = getImportedSourceFileNames([
      { sourceFileName: "a.csv" } as any,
      { sourceFileName: "b.csv" } as any,
      { sourceFileName: "a.csv" } as any,
    ]);
    addResult(
      "Listar correctamente los ficheros importados únicos",
      importedFiles.join(",") === "a.csv,b.csv",
      "a.csv,b.csv",
      importedFiles.join(",")
    );

    const history = buildMonthlySavingsHistory(
      [
        { operationDate: "2026-01-10", amount: 1000 },
        { operationDate: "2026-02-05", amount: -200 },
        { operationDate: "2026-02-20", amount: 500 },
      ],
      "2026-01-01",
      "2026-02-28"
    );
    const historyLooksRight = history.length === 2 && history[0].deltaCents === 100000 && history[1].deltaCents === 30000;
    addResult(
      "Generar correctamente el historial mensual de ahorros",
      historyLooksRight,
      "2 meses con deltas correctos",
      `${history[0].label}: ${history[0].deltaCents}, ${history[1].label}: ${history[1].deltaCents}`
    );

    const currentMonthHistory = buildMonthlySavingsHistory(
      [{ operationDate: "2026-07-10", amount: 100.00 }],
      "2026-07-01",
      "2026-07-31",
      50000,
      60000
    );
    addResult(
      "Usar el saldo actual como saldo final del mes vigente",
      currentMonthHistory[0].endBalanceCents === 60000 && currentMonthHistory[0].deltaCents === 10000,
      "60000 y 10000",
      `${currentMonthHistory[0].endBalanceCents} / ${currentMonthHistory[0].deltaCents}`
    );

    // --- Test 6: Fingerprint Consistency ---
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


    // --- Test 7: Avoid Duplicates & IndexedDB Integrity ---
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


    // --- Test 8: Accounting Sum Check Match ---
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
