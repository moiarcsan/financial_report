import React, { useMemo, useState } from "react";
import { type BankMovement } from "../types/movement";
import { calculateMonthlyMetrics } from "../utils/balanceEvolutionUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { TrendingUp, TrendingDown, Zap, Target, Calendar } from "lucide-react";

interface FinancialKPIsProps {
  movements: BankMovement[];
  initialBalanceCents: number;
  currentBalanceCents: number;
  userRules?: Map<string, string>;
}

function getCurrentMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

export const FinancialKPIs: React.FC<FinancialKPIsProps> = ({
  movements,
  initialBalanceCents,
  currentBalanceCents,
  userRules,
}) => {
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const mov of movements) {
      months.add(mov.operationDate.substring(0, 7));
    }
    return Array.from(months).sort().reverse();
  }, [movements]);

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const effectiveMonth = availableMonths.length > 0 && !availableMonths.includes(selectedMonth)
    ? availableMonths[0]
    : selectedMonth;

  const metrics = useMemo(
    () => calculateMonthlyMetrics(movements, initialBalanceCents, currentBalanceCents, effectiveMonth, userRules),
    [movements, initialBalanceCents, currentBalanceCents, effectiveMonth, userRules]
  );

  const netIncome = metrics.monthlyNetBalanceCents;
  const netIncomeIsPositive = netIncome > 0;
  const isSavingsRatePositive = metrics.savingsRatePercent > 0;

  // KPI items
  const kpis = [
    {
      label: "Tasa de ahorro",
      value: `${metrics.savingsRatePercent.toFixed(1)}%`,
      sublabel: `de ${formatCentsToEuro(metrics.monthlyIncomesCents)}`,
      icon: Target,
      color: isSavingsRatePositive ? "text-emerald-600" : "text-rose-600",
      bgColor: isSavingsRatePositive ? "bg-emerald-50" : "bg-rose-50",
      trend: isSavingsRatePositive ? "good" : "warning",
    },
    {
      label: "Ingresos",
      value: formatCentsToEuro(metrics.monthlyIncomesCents),
      sublabel: "bruto",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      trend: "neutral",
    },
    {
      label: "Gastos",
      value: formatCentsToEuro(metrics.monthlyExpensesCents),
      sublabel: `${formatCentsToEuro(metrics.dailyAverageExpenseCents)}/día promedio`,
      icon: TrendingDown,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      trend: "neutral",
    },
    {
      label: "Balance neto real",
      value: formatCentsToEuro(netIncome),
      sublabel: `en ${metrics.daysTracked} días`,
      icon: Zap,
      color: netIncomeIsPositive ? "text-emerald-600" : "text-rose-600",
      bgColor: netIncomeIsPositive ? "bg-emerald-50" : "bg-rose-50",
      trend: netIncomeIsPositive ? "good" : "warning",
    },
  ];

  return (
    <div className="mb-8 rounded-3xl border border-slate-200/60 bg-white shadow-xl overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between gap-2 flex-col sm:flex-row">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">KPIs mensuales (excluye transferencias)</h3>
          <p className="text-xs text-slate-500 mt-1">
            Resumen financiero del mes seleccionado
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <select
            value={effectiveMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs sm:text-sm font-sans text-slate-700 border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer flex-1 sm:flex-none"
            aria-label="Seleccionar mes para KPIs"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border border-slate-200/60 ${kpi.bgColor} transition-all hover:shadow-md hover:border-slate-300`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon size={18} className={`${kpi.color} shrink-0`} />
                  {kpi.trend === "good" && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Bien
                    </span>
                  )}
                  {kpi.trend === "warning" && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                      Alerta
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                  <h4 className={`text-xl sm:text-2xl font-sans font-bold ${kpi.color} mb-2`}>
                    {kpi.value}
                  </h4>
                  <p className="text-xs text-slate-600">{kpi.sublabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips section */}
      <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
        <p className="text-xs text-slate-600">
          <span className="font-semibold">💡 Tip: </span>
          {metrics.savingsRatePercent >= 20
            ? "Excelente tasa de ahorro. Sigue así."
            : metrics.savingsRatePercent >= 10
            ? "Buena gestión. Intenta reducir gastos discrecionales para mejorar ahorro."
            : "Necesitas reducir gastos. Analiza categorías y establece límites presupuestarios."}
        </p>
      </div>
    </div>
  );
};
