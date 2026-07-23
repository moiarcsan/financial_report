import React, { useState, useMemo } from "react";
import { type BankMovement } from "../types/movement";
import { isInternalTransfer } from "../utils/categoryUtils";
import { useUserCategoryRules } from "../hooks/useUserCategoryRules";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface IncomeVsExpensesChartProps {
  movements: BankMovement[];
}

/**
 * Gets the current month as YYYY-MM string.
 */
function getCurrentMonth(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

/**
 * Formats a YYYY-MM string into a human-readable month label (e.g., "julio 2026").
 */
function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  incomeCents: number;
  expenseCents: number;
  incomeCount: number;
  expenseCount: number;
}

export const IncomeVsExpensesChart: React.FC<IncomeVsExpensesChartProps> = ({ movements }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const { rules } = useUserCategoryRules();

  // Get all available months from movements
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const mov of movements) {
      const monthKey = mov.operationDate.substring(0, 7); // YYYY-MM
      months.add(monthKey);
    }
    return Array.from(months).sort().reverse(); // Most recent first
  }, [movements]);

  // Filter movements for selected month
  const monthlyMovements = useMemo(() => {
    return movements.filter((mov) => {
      // Skip internal transfers (by concept keywords OR by resolved category / user rules)
      if (isInternalTransfer(mov.concept, rules)) {
        return false;
      }
      
      // Only include movements from selected month
      return mov.operationDate.substring(0, 7) === selectedMonth;
    });
  }, [movements, selectedMonth, rules]);

  // Calculate totals for selected month
  const { incomeCents, expenseCents, incomeCount, expenseCount } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeMovs = 0;
    let expenseMovs = 0;

    for (const mov of monthlyMovements) {
      const cents = Math.round(mov.amount * 100);
      if (cents > 0) {
        income += cents;
        incomeMovs++;
      } else if (cents < 0) {
        expense += Math.abs(cents);
        expenseMovs++;
      }
    }

    return {
      incomeCents: income,
      expenseCents: expense,
      incomeCount: incomeMovs,
      expenseCount: expenseMovs,
    };
  }, [monthlyMovements]);

  const maxAmount = Math.max(incomeCents, expenseCents);
  const incomeWidth = maxAmount > 0 ? (incomeCents / maxAmount) * 100 : 0;
  const expenseWidth = maxAmount > 0 ? (expenseCents / maxAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-sans font-semibold text-slate-800">
          Ingresos vs Gastos
        </h3>
        
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm font-sans text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
            aria-label="Seleccionar mes"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {incomeCents === 0 && expenseCents === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400">
            No hay movimientos en este mes
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Income Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">Ingresos</span>
                <span className="text-xs text-slate-500">
                  ({incomeCount} {incomeCount === 1 ? "movimiento" : "movimientos"})
                </span>
              </div>
              <span className="text-sm font-semibold text-emerald-600 font-sans">
                {formatCentsToEuro(incomeCents)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                style={{ width: `${incomeWidth}%` }}
              >
                {incomeWidth > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {incomeCents > 0 ? ((incomeCents / (incomeCents + expenseCents)) * 100).toFixed(1) : 0}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expense Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-rose-600" />
                <span className="text-sm font-medium text-slate-700">Gastos</span>
                <span className="text-xs text-slate-500">
                  ({expenseCount} {expenseCount === 1 ? "movimiento" : "movimientos"})
                </span>
              </div>
              <span className="text-sm font-semibold text-rose-600 font-sans">
                {formatCentsToEuro(expenseCents)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                style={{ width: `${expenseWidth}%` }}
              >
                {expenseWidth > 15 && (
                  <span className="text-xs font-semibold text-white">
                    {expenseCents > 0 ? ((expenseCents / (incomeCents + expenseCents)) * 100).toFixed(1) : 0}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Balance</span>
              <span className={`text-base font-bold font-sans ${incomeCents - expenseCents >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCentsToEuro(incomeCents - expenseCents)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
