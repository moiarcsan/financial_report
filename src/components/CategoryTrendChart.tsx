import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { type BankMovement } from "../types/movement";
import { categorizeConcept, CATEGORY_COLORS } from "../utils/categoryUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { TrendingUp } from "lucide-react";

export interface CategoryTrendChartProps {
  movements: BankMovement[];
  categoryRules?: Map<string, string>;
}

type PeriodType = "3months" | "6months" | "12months" | "custom";

interface MonthData {
  month: string;
  [key: string]: string | number;
}

const getPeriodMonths = (type: PeriodType): number => {
  switch (type) {
    case "3months":
      return 3;
    case "6months":
      return 6;
    case "12months":
      return 12;
    default:
      return 6;
  }
};

const getMonthsRange = (months: number): { start: string; end: string } => {
  const now = new Date();
  
  // Retroceder N-1 meses (para incluir los últimos N meses completos)
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  
  // Fin es el último día del mes actual
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const formatDate = (d: Date) => {
    // Ajustar para zona horaria local
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
};

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const monthNumberToName = (monthNum: string): string => {
  const num = parseInt(monthNum, 10);
  return monthNames[num - 1] || monthNum;
};

const formatYAxisValue = (value: number): string => {
  return (value / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Custom label renderer para mostrar valores dentro de las barras
const renderCustomLabel = (props: any, category: string) => {
  const { x, y, width, height, value } = props;
  if (!value) return null;
  
  // Para Bizum: mostrar con signo. Para el resto: mostrar valor absoluto
  const displayValue = category === "Bizum"
    ? formatCentsToEuro(value)
    : formatCentsToEuro(Math.abs(value));
  
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      fontWeight={600}
    >
      {displayValue}
    </text>
  );
};

export const CategoryTrendChart: React.FC<CategoryTrendChartProps> = ({
  movements,
  categoryRules,
}) => {
  const [period, setPeriod] = useState<PeriodType>("6months");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Get all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    movements.forEach((m) => {
      const cat = categorizeConcept(m.concept, categoryRules, m.assignedCategory);
      if (cat !== "Otros") cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [movements, categoryRules]);

  // Calculate data for the chart
  const chartData = useMemo(() => {
    const months = getPeriodMonths(period);
    const { start, end } = getMonthsRange(months);

    // Filter movements in range (sin filtro de signo)
    const filtered = movements.filter(
      (m) =>
        m.operationDate >= start &&
        m.operationDate <= end
    );

    // Group by month and category
    const monthMap: Record<string, Record<string, number>> = {};

    filtered.forEach((m) => {
      const monthKey = m.operationDate.substring(0, 7); // YYYY-MM
      const category = categorizeConcept(
        m.concept,
        categoryRules,
        m.assignedCategory
      );

      if (category === "Otros") return;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {};
      }
      // Bizum mantiene el signo; otras categorías usan valor absoluto
      const value = category === "Bizum" 
        ? Math.round(m.amount * 100)
        : Math.abs(Math.round(m.amount * 100));
      
      monthMap[monthKey][category] =
        (monthMap[monthKey][category] || 0) + value;
    });

    // Convert to chart format (keep original sign)
    const data: MonthData[] = Object.entries(monthMap)
      .sort()
      .map(([month, categories]) => ({
        month: monthNumberToName(month.substring(5)), // Convert MM to month name
        ...categories
      }));

    return data;
  }, [movements, categoryRules, period]);

  // Get categories to display
  const categoriesToShow = useMemo(() => {
    return selectedCategory ? [selectedCategory] : [];
  }, [selectedCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    if (categoriesToShow.length === 0) return null;

    const categoryTotals: Record<string, number[]> = {};

    chartData.forEach((month) => {
      categoriesToShow.forEach((cat) => {
        const value = (month[cat] || 0) as number;
        if (!categoryTotals[cat]) categoryTotals[cat] = [];
        categoryTotals[cat].push(value);
      });
    });

    // Calculate aggregated stats
    const allValues = Object.values(categoryTotals).flat();
    const avgCents = allValues.length > 0 ? allValues.reduce((a, b) => a + b) / allValues.length : 0;
    const maxCents = allValues.length > 0 ? Math.max(...allValues) : 0;
    const positiveValues = allValues.filter(v => v > 0);
    const minCents = positiveValues.length > 0 ? Math.min(...positiveValues) : 0;
    const lastValue = allValues[allValues.length - 1] || 0;
    const diffPercent =
      avgCents > 0 ? ((lastValue - avgCents) / avgCents) * 100 : 0;

    return {
      avgCents,
      maxCents,
      minCents,
      lastValue,
      diffPercent,
    };
  }, [categoriesToShow, chartData]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={24} className="text-indigo-600" />
        <h2 className="text-xl font-bold text-slate-800">
          Tendencia de Gastos por Categoría
        </h2>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6 flex-wrap items-end">
        {/* Period selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Período
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="3months">Últimos 3 meses</option>
            <option value="6months">Últimos 6 meses</option>
            <option value="12months">Últimos 12 meses</option>
          </select>
        </div>

        {/* Category selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Categoría
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Selecciona una categoría</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && categoriesToShow.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={formatYAxisValue} />
              {categoriesToShow.map((cat) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  label={(props) => renderCustomLabel(props, cat)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  Promedio Mensual
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {formatCentsToEuro(Math.round(stats.avgCents))}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  Máximo
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {formatCentsToEuro(stats.maxCents)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  Mínimo
                </p>
                <p className="text-lg font-bold text-slate-800">
                  {formatCentsToEuro(stats.minCents)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-600 mb-1">
                  vs Promedio
                </p>
                <p
                  className={`text-lg font-bold ${
                    stats.diffPercent >= 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {stats.diffPercent >= 0 ? "+" : ""}
                  {stats.diffPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-slate-500">
          No hay datos disponibles para el período seleccionado
        </div>
      )}
    </div>
  );
};
