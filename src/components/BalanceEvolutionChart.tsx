import React, { useEffect, useMemo, useState } from "react";
import { type BankMovement } from "../types/movement";
import { calculateBalanceEvolution, type BalancePoint } from "../utils/balanceEvolutionUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { Calendar, TrendingUp } from "lucide-react";

interface BalanceEvolutionChartProps {
  movements: BankMovement[];
  initialBalanceCents: number;
  startDate?: string;
  userRules?: Map<string, string>;
}

export const BalanceEvolutionChart: React.FC<BalanceEvolutionChartProps> = ({
  movements,
  initialBalanceCents,
  startDate,
  userRules,
}) => {
  const todayIso = new Date().toISOString().split("T")[0];
  const normalizedMovementDates = useMemo(() => {
    const uniqueDates = new Set<string>();
    for (const mov of movements) {
      uniqueDates.add(mov.operationDate.substring(0, 10));
    }
    return Array.from(uniqueDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [movements]);

  const minSelectableDate = startDate || normalizedMovementDates[0] || todayIso;
  const latestMovementDate = normalizedMovementDates[normalizedMovementDates.length - 1];
  const maxSelectableDate = latestMovementDate || minSelectableDate;

  const [selectedStartDate, setSelectedStartDate] = useState<string>(minSelectableDate);
  const [selectedEndDate, setSelectedEndDate] = useState<string>(maxSelectableDate);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hasUserAdjustedRange, setHasUserAdjustedRange] = useState(false);

  useEffect(() => {
    if (!latestMovementDate) return;
    if (hasUserAdjustedRange) return;

    setSelectedStartDate(minSelectableDate);
    setSelectedEndDate(maxSelectableDate);
  }, [minSelectableDate, maxSelectableDate, latestMovementDate, hasUserAdjustedRange]);

  const clampedStartDate = selectedStartDate < minSelectableDate ? minSelectableDate : selectedStartDate;
  const effectiveStartDate = clampedStartDate > maxSelectableDate ? maxSelectableDate : clampedStartDate;
  const clampedEndDate = selectedEndDate > maxSelectableDate ? maxSelectableDate : selectedEndDate;
  const effectiveEndDate = clampedEndDate < effectiveStartDate ? effectiveStartDate : clampedEndDate;

  const selectedInitialBalanceCents = useMemo(() => {
    let runningBalance = initialBalanceCents;
    for (const mov of movements) {
      const movDate = mov.operationDate.substring(0, 10);
      if (movDate < effectiveStartDate) {
        runningBalance += Math.round(mov.amount * 100);
      }
    }
    return runningBalance;
  }, [movements, initialBalanceCents, effectiveStartDate]);

  const points = useMemo(
    () => calculateBalanceEvolution(movements, selectedInitialBalanceCents, effectiveStartDate, effectiveEndDate, userRules),
    [movements, selectedInitialBalanceCents, effectiveStartDate, effectiveEndDate, userRules]
  );

  const currentBalanceCents = points.length > 0 ? points[points.length - 1].balanceCents : selectedInitialBalanceCents;
  const isPositive = currentBalanceCents >= selectedInitialBalanceCents;
  const selectedStartDateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${effectiveStartDate}T00:00:00`));
  const selectedEndDateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${effectiveEndDate}T00:00:00`));

  if (points.length === 0) {
    return (
      <div className="mb-8 rounded-3xl border border-slate-200/60 bg-white shadow-xl overflow-hidden p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
          <TrendingUp size={16} className="text-indigo-600" />
          Evolución del saldo
        </div>
        <p className="text-sm text-slate-500">
          Sin movimientos registrados para mostrar gráfico.
        </p>
      </div>
    );
  }

  // Calculate chart dimensions
  const minBalance = Math.min(...points.map((p) => p.balanceCents));
  const maxBalance = Math.max(...points.map((p) => p.balanceCents));
  const range = maxBalance - minBalance || 1;
  const padding = range * 0.1;
  const chartMin = minBalance - padding;
  const chartMax = maxBalance + padding;
  const chartRange = chartMax - chartMin;

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 300;
  const chartLeft = 110;
  const chartRight = 30;
  const chartTop = 30;
  const chartBottom = 40;

  const chartWidth = svgWidth - chartLeft - chartRight;
  const chartHeight = svgHeight - chartTop - chartBottom;

  const getPointPosition = (point: BalancePoint, idx: number) => {
    const x = chartLeft + (idx / (points.length - 1 || 1)) * chartWidth;
    const y = chartTop + chartHeight - ((point.balanceCents - chartMin) / chartRange) * chartHeight;
    return { x, y };
  };

  // Generate SVG path for line
  const pathData = points
    .map((point, idx) => {
      const x = chartLeft + (idx / (points.length - 1 || 1)) * chartWidth;
      const y = chartTop + chartHeight - ((point.balanceCents - chartMin) / chartRange) * chartHeight;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const trendLineData = useMemo(() => {
    if (points.length < 2) return null;

    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    points.forEach((point, idx) => {
      sumX += idx;
      sumY += point.balanceCents;
      sumXY += idx * point.balanceCents;
      sumX2 += idx * idx;
    });

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    const startX = chartLeft;
    const endX = chartLeft + chartWidth;
    const startBalance = intercept;
    const endBalance = slope * (n - 1) + intercept;
    const startY = chartTop + chartHeight - ((startBalance - chartMin) / chartRange) * chartHeight;
    const endY = chartTop + chartHeight - ((endBalance - chartMin) / chartRange) * chartHeight;

    // Keep the trend line inside chart bounds.
    const clampY = (y: number) => Math.max(chartTop, Math.min(chartTop + chartHeight, y));

    return {
      path: `M ${startX} ${clampY(startY)} L ${endX} ${clampY(endY)}`,
      slope,
    };
  }, [points, chartLeft, chartWidth, chartTop, chartHeight, chartMin, chartRange]);

  // Color based on trend
  const lineColor = isPositive ? "#10b981" : "#ef4444";
  const areaColor = isPositive ? "rgb(16, 185, 129, 0.1)" : "rgb(239, 68, 68, 0.1)";

  // Y-axis labels
  const ySteps = 4;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const value = chartMin + (chartRange / ySteps) * (ySteps - i);
    return value;
  });

  const hoveredPoint = hoveredPointIndex !== null ? points[hoveredPointIndex] : null;
  const hoveredPosition =
    hoveredPointIndex !== null && hoveredPoint ? getPointPosition(hoveredPoint, hoveredPointIndex) : null;
  const hoveredLabel = hoveredPoint ? formatCentsToEuro(hoveredPoint.balanceCents) : "";
  const measuredLabelWidth = useMemo(() => {
    if (!hoveredLabel) return 0;
    if (typeof document === "undefined") return hoveredLabel.length * 7;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return hoveredLabel.length * 7;

    context.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    return Math.ceil(context.measureText(hoveredLabel).width);
  }, [hoveredLabel]);

  const tooltipWidth = Math.max(96, measuredLabelWidth + 16);
  const tooltipX = hoveredPosition
    ? Math.max(chartLeft, Math.min(hoveredPosition.x - tooltipWidth / 2, svgWidth - chartRight - tooltipWidth))
    : 0;
  const tooltipY = hoveredPosition ? Math.max(chartTop, hoveredPosition.y - 34) : 0;

  return (
    <div className="mb-8 rounded-3xl border border-slate-200/60 bg-white shadow-xl overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between gap-2 flex-col sm:flex-row">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <TrendingUp size={16} className="text-indigo-600" />
            Evolución del saldo
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualización diaria del saldo real de las cuentas
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Incluye línea de tendencia del rango seleccionado
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Rango seleccionado: {selectedStartDateLabel} - {selectedEndDateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <input
            type="date"
            value={effectiveStartDate}
            min={minSelectableDate}
            max={effectiveEndDate}
            onChange={(e) => {
              setHasUserAdjustedRange(true);
              setSelectedStartDate(e.target.value);
            }}
            className="text-xs sm:text-sm font-sans text-slate-700 border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            aria-label="Seleccionar fecha de inicio para evolución del saldo"
          />
          <span className="text-xs text-slate-400">a</span>
          <input
            type="date"
            value={effectiveEndDate}
            min={effectiveStartDate}
            max={maxSelectableDate}
            onChange={(e) => {
              setHasUserAdjustedRange(true);
              setSelectedEndDate(e.target.value);
            }}
            className="text-xs sm:text-sm font-sans text-slate-700 border border-slate-300 rounded-lg px-2 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            aria-label="Seleccionar fecha de fin para evolución del saldo"
          />
        </div>
      </div>

      <div className="p-6 overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="min-w-full">
          {/* Grid lines */}
          {yLabels.map((value, idx) => {
            const y = chartTop + (idx / ySteps) * chartHeight;
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={chartLeft}
                  y1={y}
                  x2={svgWidth - chartRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={chartLeft - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-slate-400"
                >
                  {formatCentsToEuro(Math.round(value))}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={svgHeight - chartBottom} stroke="#94a3b8" strokeWidth="2" />
          <line x1={chartLeft} y1={svgHeight - chartBottom} x2={svgWidth - chartRight} y2={svgHeight - chartBottom} stroke="#94a3b8" strokeWidth="2" />

          {/* Area under line */}
          <path
            d={`${pathData} L ${chartLeft + chartWidth} ${svgHeight - chartBottom} L ${chartLeft} ${svgHeight - chartBottom} Z`}
            fill={areaColor}
          />

          {/* Line */}
          <path d={pathData} stroke={lineColor} strokeWidth="2.5" fill="none" />

          {/* Trend line */}
          {trendLineData && (
            <path
              d={trendLineData.path}
              stroke="#1d4ed8"
              strokeWidth="2"
              strokeDasharray="6 4"
              fill="none"
              opacity="0.9"
            />
          )}

          {/* Points */}
          {points.map((point, idx) => {
            const { x, y } = getPointPosition(point, idx);
            return (
              <circle
                key={`point-${idx}`}
                cx={x}
                cy={y}
                r="3"
                fill={lineColor}
                stroke="white"
                strokeWidth="1.5"
                className="hover:r-5 transition-all"
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                <title>{formatCentsToEuro(point.balanceCents)}</title>
              </circle>
            );
          })}

          {/* Hover tooltip */}
          {hoveredPoint && hoveredPosition && (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipWidth}
                height="24"
                rx="6"
                fill="#0f172a"
                opacity="0.95"
              />
              <text
                x={tooltipX + tooltipWidth / 2}
                y={tooltipY + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-white"
                fontSize="12"
                fontWeight="600"
              >
                {hoveredLabel}
              </text>
            </g>
          )}

          {/* X-axis labels (show every Nth point) */}
          {points.map((point, idx) => {
            const step = Math.ceil(points.length / 8);
            if (idx % step !== 0 && idx !== points.length - 1) return null;

            const { x } = getPointPosition(point, idx);
            const y = svgHeight - chartBottom + 20;

            return (
              <text
                key={`label-${idx}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="start"
                className="text-xs fill-slate-500"
              >
                {point.dateLabel}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Summary */}
      <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-slate-500">Saldo el {selectedStartDateLabel}:</span>
          <span className="ml-2 font-semibold text-slate-800">
            {formatCentsToEuro(selectedInitialBalanceCents)}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Saldo el {selectedEndDateLabel}:</span>
          <span className={`ml-2 font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCentsToEuro(currentBalanceCents)}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Cambio:</span>
          <span className={`ml-2 font-semibold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
            {isPositive ? "+" : ""}
            {formatCentsToEuro(currentBalanceCents - selectedInitialBalanceCents)}
          </span>
        </div>
      </div>
    </div>
  );
};
