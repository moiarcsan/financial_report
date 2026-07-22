import React, { useState } from "react";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { type MonthlySavingsPoint } from "../utils/savingsHistory";
import { TrendingUp, CalendarRange, Edit3, Check, X } from "lucide-react";

interface SavingsHistoryProps {
  history: MonthlySavingsPoint[];
  monthlyTargetCents: number;
  onMonthlyTargetChange: (euros: number) => void;
}

export const SavingsHistory: React.FC<SavingsHistoryProps> = ({
  history,
  monthlyTargetCents,
  onMonthlyTargetChange,
}) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTargetInput, setTempTargetInput] = useState("");

  const latestMonth = history[history.length - 1];
  const latestDeltaVsTarget = latestMonth ? latestMonth.deltaCents - monthlyTargetCents : 0;

  const handleStartEdit = () => {
    setTempTargetInput(String(monthlyTargetCents / 100));
    setIsEditingTarget(true);
  };

  const handleConfirmEdit = () => {
    const parsed = parseFloat(tempTargetInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onMonthlyTargetChange(parsed);
    }
    setIsEditingTarget(false);
  };

  const handleCancelEdit = () => {
    setIsEditingTarget(false);
    setTempTargetInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleConfirmEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarRange size={16} className="text-emerald-600" />
            Historial de ahorros
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Evolución mensual del saldo acumulado para comparar con la meta de {formatCentsToEuro(monthlyTargetCents)}/mes.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="flex items-center gap-2 font-semibold">
            <TrendingUp size={16} />
            Meta mensual: {formatCentsToEuro(monthlyTargetCents)}
          </div>
          <div className="mt-1 text-xs text-emerald-700/80">
            {latestMonth
              ? `Último mes: ${latestMonth.label} · ${formatCentsToEuro(latestMonth.deltaCents)} · ${latestDeltaVsTarget >= 0 ? "+" : ""}${formatCentsToEuro(latestDeltaVsTarget)} vs meta`
              : "Sin datos aún"}
          </div>
        </div>
      </div>

      {/* Editable target row */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">
            Ajustar meta de ahorro mensual
          </label>
          {isEditingTarget ? (
            <>
              <input
                type="number"
                min="0"
                step="10"
                value={tempTargetInput}
                onChange={(e) => setTempTargetInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-32 px-3 py-1.5 text-sm font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">€</span>
            </>
          ) : (
            <span className="text-sm font-sans text-slate-800">{formatCentsToEuro(monthlyTargetCents)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditingTarget ? (
            <>
              <button
                onClick={handleConfirmEdit}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                title="Confirmar"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Editar meta de ahorro"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mes</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo inicio</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Saldo fin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ahorro</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {history.map((point) => {
              const vsTarget = point.deltaCents - monthlyTargetCents;
              return (
                <tr key={point.monthKey} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{point.label}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatCentsToEuro(point.startBalanceCents)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{formatCentsToEuro(point.endBalanceCents)}</td>
                  <td className={`px-6 py-4 text-sm font-semibold ${point.deltaCents >= monthlyTargetCents ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatCentsToEuro(point.deltaCents)}
                  </td>
                  <td className={`px-6 py-4 text-sm ${vsTarget >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {vsTarget >= 0 ? "+" : ""}{formatCentsToEuro(vsTarget)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
