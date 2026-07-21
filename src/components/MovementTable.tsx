import React from "react";
import { type BankMovement } from "../types/movement";
import { formatDateToSpanish } from "../utils/dateUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { Calendar, Tag, CreditCard } from "lucide-react";

interface MovementTableProps {
  movements: BankMovement[];
}

export const MovementTable: React.FC<MovementTableProps> = ({ movements }) => {
  // Sort by date descending (most recent first)
  const sortedMovements = [...movements].sort((a, b) => {
    const dateCompare = b.operationDate.localeCompare(a.operationDate);
    if (dateCompare !== 0) return dateCompare;
    // Fallback sort: latest imported first, then higher absolute amount
    const importedCompare = b.importedAt.localeCompare(a.importedAt);
    if (importedCompare !== 0) return importedCompare;
    return Math.abs(b.amount) - Math.abs(a.amount);
  });

  const getBankBadgeClass = (bank: "N26" | "Unicaja" | "Sabadell") => {
    switch (bank) {
      case "N26":
        return "bg-teal-50 text-teal-700 border-teal-200/50";
      case "Unicaja":
        return "bg-green-50 text-green-700 border-green-200/50";
      case "Sabadell":
        return "bg-blue-50 text-blue-700 border-blue-200/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/50";
    }
  };

  return (
    <div id="movements-table-container" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-sans font-semibold text-slate-800">
          Listado de movimientos unificados
        </h3>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          {sortedMovements.length} transacciones
        </span>
      </div>

      <div className="overflow-x-auto">
        {sortedMovements.length === 0 ? (
          <div id="empty-state-message" className="p-16 text-center flex flex-col items-center justify-center">
            <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
              <Calendar size={32} />
            </div>
            <p className="text-base font-sans font-medium text-slate-600">
              Todavía no hay movimientos importados.
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Selecciona uno o varios ficheros de extractos bancarios de N26, Unicaja o Sabadell para verlos unificados aquí.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5 font-semibold">Fecha</th>
                <th className="py-3.5 px-5 font-semibold">Fecha valor</th>
                <th className="py-3.5 px-5 font-semibold">Banco</th>
                <th className="py-3.5 px-5 font-semibold">Cuenta</th>
                <th className="py-3.5 px-5 font-semibold">Concepto</th>
                <th className="py-3.5 px-5 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedMovements.map((mov) => {
                const amountCents = Math.round(mov.amount * 100);
                const isPositive = amountCents >= 0;

                return (
                  <tr 
                    key={mov.id} 
                    id={`row-${mov.id}`}
                    className="hover:bg-slate-50/50 transition-colors duration-150"
                  >
                    {/* Fecha */}
                    <td className="py-3 px-5 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {formatDateToSpanish(mov.operationDate)}
                    </td>

                    {/* Fecha Valor */}
                    <td className="py-3 px-5 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {mov.valueDate ? formatDateToSpanish(mov.valueDate) : "-"}
                    </td>

                    {/* Banco */}
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${getBankBadgeClass(mov.bank)}`}>
                        {mov.bank}
                      </span>
                    </td>

                    {/* Cuenta */}
                    <td className="py-3 px-5 whitespace-nowrap text-slate-600 font-mono text-xs">
                      <span className="flex items-center">
                        <CreditCard size={12} className="text-slate-400 mr-1.5" />
                        {mov.account}
                      </span>
                    </td>

                    {/* Concepto */}
                    <td className="py-3 px-5 max-w-xs md:max-w-md truncate text-slate-700 font-medium font-sans">
                      <span className="flex items-center">
                        <Tag size={12} className="text-slate-400 mr-2 shrink-0" />
                        <span className="truncate" title={mov.concept}>{mov.concept}</span>
                      </span>
                    </td>

                    {/* Importe */}
                    <td className={`py-3 px-5 text-right whitespace-nowrap font-semibold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                      {isPositive ? "+" : ""}
                      {formatCentsToEuro(amountCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
