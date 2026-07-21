import * as XLSX from "xlsx";

/**
 * Automatically detects the bank format of a given worksheet based on its headers/cell values.
 */
export function detectBankFormat(sheet: XLSX.WorkSheet): "N26" | "Unicaja" | "Sabadell" | null {
  // Convert sheet to an array of rows to scan all cell contents
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: "" });
  
  const cellValues = new Set<string>();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).trim();
      if (val) {
        cellValues.add(val);
      }
    }
  }

  // 1. N26 check: Booking Date and Amount (EUR)
  if (cellValues.has("Booking Date") && cellValues.has("Amount (EUR)")) {
    return "N26";
  }

  // 2. Unicaja check: Fecha de operación, Concepto and Importe
  if (
    cellValues.has("Fecha de operación") && 
    cellValues.has("Concepto") && 
    cellValues.has("Importe")
  ) {
    return "Unicaja";
  }

  // 3. Sabadell check: F. Operativa, F. Valor and Importe
  if (
    cellValues.has("F. Operativa") && 
    cellValues.has("F. Valor") && 
    cellValues.has("Importe")
  ) {
    return "Sabadell";
  }

  return null;
}
