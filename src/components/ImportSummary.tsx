import React from "react";
import { type GlobalImportResult } from "../types/movement";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { CheckCircle2, AlertTriangle, FileSpreadsheet, XCircle } from "lucide-react";

interface ImportSummaryProps {
  summary: GlobalImportResult | null;
  onClose: () => void;
}

export const ImportSummary: React.FC<ImportSummaryProps> = ({ summary, onClose }) => {
  if (!summary) return null;

  return (
    <div id="import-summary-overlay" className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-fadeIn">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-200">
        <div className="flex items-center">
          <CheckCircle2 size={20} className="text-emerald-500 mr-2" />
          <h3 className="text-base font-sans font-semibold text-slate-800">
            Importación completada
          </h3>
        </div>
        <button
          id="btn-close-summary"
          onClick={onClose}
          className="text-xs font-mono px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-all"
        >
          Cerrar resumen
        </button>
      </div>

      {/* File-by-file results */}
      <div id="file-results-list" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {summary.files.map((file, idx) => {
          const isSuccess = file.status === "success";
          return (
            <div
              key={idx}
              id={`file-summary-${idx}`}
              className={`p-4 rounded-xl border ${
                isSuccess 
                  ? "bg-white border-slate-200/60" 
                  : "bg-rose-50/40 border-rose-200/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center overflow-hidden mr-2">
                  <FileSpreadsheet size={16} className={`mr-2 shrink-0 ${isSuccess ? "text-indigo-500" : "text-rose-500"}`} />
                  <span className="font-semibold text-sm text-slate-800 truncate" title={file.fileName}>
                    {file.fileName}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold rounded-md ${
                  isSuccess 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}>
                  {isSuccess ? "CORRECTO" : "ERROR"}
                </span>
              </div>

              {isSuccess ? (
                <div className="space-y-1.5 text-xs text-slate-600 font-sans">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Banco detectado:</span>
                    <span className="font-semibold text-slate-700">{file.bankDetected}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Leídos:</span>
                    <span className="font-medium">{file.movementsRead}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Nuevos:</span>
                    <span className="font-medium text-emerald-600">+{file.movementsNew}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Duplicados:</span>
                    <span className="font-medium text-amber-600">{file.movementsDuplicated}</span>
                  </div>
                  {file.discardedRows > 0 && (
                    <div className="flex justify-between font-mono text-rose-600 font-medium">
                      <span>Filas descartadas:</span>
                      <span>{file.discardedRows}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-slate-100 font-mono font-bold text-slate-800">
                    <span>Suma neta:</span>
                    <span className={file.netSumCents >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {formatCentsToEuro(file.netSumCents)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-rose-700">
                  <div className="flex items-start mb-2">
                    <XCircle size={14} className="mr-1.5 shrink-0 mt-0.5" />
                    <p className="font-medium">{file.errorDetails || "Error desconocido al procesar el archivo."}</p>
                  </div>
                  <div className="flex justify-between font-mono text-[11px] text-rose-500 pt-1 border-t border-rose-100">
                    <span>Banco:</span>
                    <span>{file.bankDetected}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global summary totals */}
      <div id="global-import-totals" className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3.5">
          Resumen global de esta importación
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-800/40 rounded-lg">
            <span className="block text-[11px] font-mono text-slate-400 uppercase">Leídos</span>
            <span className="block text-xl font-bold font-mono mt-0.5">{summary.totalRead}</span>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-lg">
            <span className="block text-[11px] font-mono text-slate-400 uppercase">Nuevos</span>
            <span className="block text-xl font-bold font-mono mt-0.5 text-emerald-400">+{summary.totalNew}</span>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-lg">
            <span className="block text-[11px] font-mono text-slate-400 uppercase">Duplicados</span>
            <span className="block text-xl font-bold font-mono mt-0.5 text-amber-400">{summary.totalDuplicated}</span>
          </div>
          <div className="p-3 bg-slate-800/40 rounded-lg">
            <span className="block text-[11px] font-mono text-slate-400 uppercase">Suma neta total</span>
            <span className={`block text-xl font-bold font-mono mt-0.5 ${summary.totalNetSumCents >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCentsToEuro(summary.totalNetSumCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
