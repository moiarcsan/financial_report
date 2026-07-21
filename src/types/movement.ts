export interface BankMovement {
  id: string; // Can be the same as fingerprint
  fingerprint: string;
  bank: "N26" | "Unicaja" | "Sabadell";
  account: string;
  operationDate: string; // Format: YYYY-MM-DD
  valueDate: string | null; // Format: YYYY-MM-DD or null
  concept: string;
  amount: number;
  currency: "EUR";
  sourceFileName: string;
  importedAt: string;
}

export interface FileImportResult {
  fileName: string;
  bankDetected: "N26" | "Unicaja" | "Sabadell" | "Desconocido";
  status: "success" | "error";
  errorDetails?: string;
  movementsRead: number;
  movementsNew: number;
  movementsDuplicated: number;
  netSumCents: number; // Sum in cents to prevent float errors
  discardedRows: number; // Lacking valid date or amount
}

export interface GlobalImportResult {
  files: FileImportResult[];
  totalFiles: number;
  totalSuccess: number;
  totalErrors: number;
  totalRead: number;
  totalNew: number;
  totalDuplicated: number;
  totalNetSumCents: number;
}
