import React, { useState, useMemo } from "react";
import { type BankMovement } from "../types/movement";
import {
  summarizeExpensesByCategory,
  getUncategorizedMovements,
} from "../utils/categoryUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { useUserCategoryRules, getAllAssignableCategories, getAllCategoryColors } from "../hooks/useUserCategoryRules";
import { PieChart, Wallet, Calendar, AlertCircle, Check, X, Plus, Tag, Trash2, Edit3 } from "lucide-react";

export interface CategoryFilter {
  category: string;
  month: string;
}

interface ExpenseAnalysisProps {
  movements: BankMovement[];
  onCategorySelect?: (filter: CategoryFilter | null) => void;
}

/**
 * Converts polar coordinates to Cartesian coordinates for SVG arc drawing.
 */
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generates the SVG path for a donut slice (outer arc + inner arc).
 */
function describeDonutSlice(centerX: number, centerY: number, outerRadius: number, innerRadius: number, startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M", outerStart.x, outerStart.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
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

export const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ movements, onCategorySelect }) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const { rules, addRules, ruleCount, customCategories, addCustomCategory, removeCustomCategory, customCategoryColors } = useUserCategoryRules();
  const categoryColors = getAllCategoryColors(customCategories, customCategoryColors);

  // ── Uncategorized review state ──────────────────────────────
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [batchCategory, setBatchCategory] = useState<string>("Supermercado");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // ── New custom category state ───────────────────────────────
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryError, setNewCategoryError] = useState("");

  // ── Concept filter state ────────────────────────────────────
  const [conceptFilter, setConceptFilter] = useState("");

  // Get all available months from movements that have expenses (negative amounts)
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const mov of movements) {
      if (mov.amount < 0) {
        const monthKey = mov.operationDate.substring(0, 7); // YYYY-MM
        months.add(monthKey);
      }
    }
    return Array.from(months).sort().reverse(); // Most recent first
  }, [movements]);

  // Default to current month, or the most recent available month if current isn't in the list
  const defaultMonth = availableMonths.includes(getCurrentMonth())
    ? getCurrentMonth()
    : (availableMonths[0] || getCurrentMonth());

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Filter movements to only expenses in the selected month
  const monthlyExpenseMovements = useMemo(() => {
    return movements.filter((mov) => {
      return mov.amount < 0 && mov.operationDate.substring(0, 7) === selectedMonth;
    });
  }, [movements, selectedMonth]);

  const categorySummaries = summarizeExpensesByCategory(monthlyExpenseMovements, rules).map((cat) => ({
    ...cat,
    color: categoryColors[cat.category] || cat.color,
  }));
  const totalExpensesCents = categorySummaries.reduce((sum, c) => sum + c.totalCents, 0);

  // Uncategorized movements (across ALL months, not just selected)
  const allExpenseMovements = useMemo(() => {
    return movements.filter((mov) => mov.amount < 0);
  }, [movements]);

  const uncategorizedMovements = useMemo(() => {
    return getUncategorizedMovements(allExpenseMovements, rules);
  }, [allExpenseMovements, rules]);

  // Group uncategorized by concept to show unique ones
  const uniqueUncategorized = useMemo(() => {
    const seen = new Set<string>();
    return uncategorizedMovements.filter((mov) => {
      const key = mov.concept.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [uncategorizedMovements]);

  // Filter uniqueUncategorized by concept text
  const filteredUniqueUncategorized = useMemo(() => {
    if (!conceptFilter.trim()) return uniqueUncategorized;
    const filter = conceptFilter.toLowerCase().trim();
    return uniqueUncategorized.filter((mov) =>
      mov.concept.toLowerCase().includes(filter)
    );
  }, [uniqueUncategorized, conceptFilter]);

  const assignableCategories = getAllAssignableCategories(customCategories);

  // ── Handlers ────────────────────────────────────────────────
  const handleCreateCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setNewCategoryError("El nombre no puede estar vacío.");
      return;
    }
    const added = addCustomCategory(name);
    if (!added) {
      setNewCategoryError("Esa categoría ya existe.");
      return;
    }
    setBatchCategory(name);
    setNewCategoryName("");
    setNewCategoryError("");
    setShowNewCategoryInput(false);
  };
  const toggleSelectConcept = (concept: string) => {
    setSelectedConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(concept)) {
        next.delete(concept);
      } else {
        next.add(concept);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedConcepts(new Set(filteredUniqueUncategorized.map((m) => m.concept)));
  };

  const deselectAll = () => {
    setSelectedConcepts(new Set());
  };

  const applyBatchCategory = () => {
    if (selectedConcepts.size === 0) return;

    const newRules = Array.from(selectedConcepts).map((concept) => ({
      keyword: concept,
      category: batchCategory,
    }));

    addRules(newRules);
    setSelectedConcepts(new Set());
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const centerX = 100;
  const centerY = 100;
  const outerRadius = 85;
  const innerRadius = 55;

  let currentAngle = 0;
  const slices = categorySummaries.map((cat) => {
    const sliceAngle = (cat.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    return {
      ...cat,
      path: describeDonutSlice(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle),
      startAngle,
      endAngle,
      midAngle: (startAngle + endAngle) / 2,
    };
  });

  // ── Create category always visible ──────────────────────────
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [createCategoryName, setCreateCategoryName] = useState("");
  const [createCategoryError, setCreateCategoryError] = useState("");

  const handleCreateCategoryAlways = () => {
    const name = createCategoryName.trim();
    if (!name) {
      setCreateCategoryError("El nombre no puede estar vacío.");
      return;
    }
    const added = addCustomCategory(name);
    if (!added) {
      setCreateCategoryError("Esa categoría ya existe.");
      return;
    }
    setCreateCategoryName("");
    setCreateCategoryError("");
    setShowCreateCategory(false);
  };

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <PieChart size={16} className="text-indigo-600" />
            Análisis de gastos por categoría
          </div>

          <div className="flex items-center gap-2">
            {/* Always-visible create category button */}
            <button
              onClick={() => setShowCreateCategory(!showCreateCategory)}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Crear nueva categoría"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nueva categoría</span>
            </button>

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
        </div>

        {/* Always-visible create category form */}
        {showCreateCategory && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={createCategoryName}
              onChange={(e) => {
                setCreateCategoryName(e.target.value);
                setCreateCategoryError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCategoryAlways();
                if (e.key === "Escape") {
                  setShowCreateCategory(false);
                  setCreateCategoryName("");
                  setCreateCategoryError("");
                }
              }}
              placeholder="Nombre de la nueva categoría..."
              className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              autoFocus
            />
            <button
              onClick={handleCreateCategoryAlways}
              className="flex items-center gap-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Check size={14} />
              <span>Crear</span>
            </button>
            <button
              onClick={() => {
                setShowCreateCategory(false);
                setCreateCategoryName("");
                setCreateCategoryError("");
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
            {createCategoryError && (
              <span className="text-xs text-red-500 ml-1">{createCategoryError}</span>
            )}
          </div>
        )}

        <p className="text-sm text-slate-500 mt-1">
          Distribución de los {categorySummaries.reduce((sum, c) => sum + c.movementCount, 0)} movimientos de gasto en {formatMonthLabel(selectedMonth)} ({formatCentsToEuro(totalExpensesCents)} total).
        </p>
      </div>

      {categorySummaries.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
            <Wallet size={32} />
          </div>
          <p className="text-base font-sans font-medium text-slate-600">
            No hay movimientos de gasto para analizar en este mes.
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            Selecciona otro mes o importa tus extractos bancarios para ver el desglose de gastos por categoría.
          </p>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Donut Chart */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative" style={{ width: 420, height: 420 }}>
                <svg width="420" height="420" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={outerRadius}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />

                  {/* Donut slices */}
                  {slices.map((slice, idx) => (
                    <path
                      key={idx}
                      d={slice.path}
                      fill={slice.color}
                      stroke="white"
                      strokeWidth="2"
                      style={{
                        opacity: hoveredCategory === null || hoveredCategory === slice.category ? 1 : 0.4,
                        transition: "opacity 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredCategory(slice.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      onClick={() => {
                        const newCat = selectedCategoryFilter === slice.category ? null : slice.category;
                        setSelectedCategoryFilter(newCat);
                        onCategorySelect?.(newCat ? { category: newCat, month: selectedMonth } : null);
                      }}
                    />
                  ))}

                  {/* Center label */}
                  <text
                    x={centerX}
                    y={centerY - 14}
                    textAnchor="middle"
                    className="text-sm font-sans fill-slate-500 uppercase tracking-wider"
                  >
                    Total
                  </text>
                  <text
                    x={centerX}
                    y={centerY + 4}
                    textAnchor="middle"
                    className="text-xl font-sans font-bold fill-slate-800"
                  >
                    {formatCentsToEuro(totalExpensesCents)}
                  </text>
                </svg>

                {/* Hover tooltip */}
                {hoveredCategory && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-sans whitespace-nowrap shadow-lg z-20">
                    {hoveredCategory}
                  </div>
                )}
              </div>

              {/* Mobile: total below chart */}
              <div className="mt-4 lg:hidden text-center">
                <span className="text-xs text-slate-500">Total gastos</span>
                <p className="text-xl font-bold text-slate-800">{formatCentsToEuro(totalExpensesCents)}</p>
              </div>
            </div>

            {/* Legend Table */}
            <div className="lg:w-[420px] w-full">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="text-slate-500 font-sans text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-semibold">Categoría</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Importe</th>
                      <th className="py-2.5 px-3 font-semibold text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categorySummaries.map((cat) => (
                      <tr
                        key={cat.category}
                        className="hover:bg-slate-50/70 transition-colors"
                        onMouseEnter={() => setHoveredCategory(cat.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => {
                          const newCat = selectedCategoryFilter === cat.category ? null : cat.category;
                          setSelectedCategoryFilter(newCat);
                          onCategorySelect?.(newCat ? { category: newCat, month: selectedMonth } : null);
                        }}
                        style={{
                          opacity: hoveredCategory === null || hoveredCategory === cat.category ? 1 : 0.4,
                          transition: "opacity 0.2s ease",
                          cursor: "pointer",
                        }}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: categoryColors[cat.category] || cat.color }}
                            />
                            <span className="text-slate-700 font-medium text-sm">{cat.category}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-sans text-slate-800 text-sm">
                          {formatCentsToEuro(cat.totalCents)}
                        </td>
                        <td className="py-2 px-3 text-right font-sans text-slate-600 text-sm">
                          {cat.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Uncategorized Review Section ─────────────────────────── */}
      {uncategorizedMovements.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <span>
                {uncategorizedMovements.length} movimiento{uncategorizedMovements.length !== 1 ? "s" : ""} sin categorizar
              </span>
              {ruleCount > 0 && (
                <span className="text-xs text-slate-400 ml-2">
                  ({ruleCount} regla{ruleCount !== 1 ? "s" : ""} personal{ruleCount !== 1 ? "es" : ""} guardada{ruleCount !== 1 ? "s" : ""})
                </span>
              )}
            </div>
            <span className="text-slate-400">{showReview ? "▲" : "▼"}</span>
          </button>

          {showReview && (
            <div className="px-6 pb-6">
              {/* Success message */}
              {showSuccess && (
                <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <Check size={16} />
                  <span>
                    {selectedConcepts.size} concepto{selectedConcepts.size !== 1 ? "s" : ""} categorizado{selectedConcepts.size !== 1 ? "s" : ""} como "{batchCategory}". Las reglas se guardaron automáticamente.
                  </span>
                </div>
              )}

              {/* Batch actions bar */}
              {uniqueUncategorized.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Tag size={14} />
                    <span>Asignar categoría:</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value)}
                      className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {assignableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    {/* Create new category button */}
                    <button
                      onClick={() => {
                        setShowNewCategoryInput(!showNewCategoryInput);
                        setNewCategoryError("");
                        setNewCategoryName("");
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Crear nueva categoría"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={selectAll}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                    >
                      Deseleccionar
                    </button>
                    <button
                      onClick={applyBatchCategory}
                      disabled={selectedConcepts.size === 0}
                      className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      <span>Aplicar a {selectedConcepts.size > 0 ? `${selectedConcepts.size}` : "0"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* New category input */}
              {showNewCategoryInput && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setNewCategoryError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCategory();
                      if (e.key === "Escape") {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                        setNewCategoryError("");
                      }
                    }}
                    placeholder="Nombre de la nueva categoría..."
                    className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateCategory}
                    className="flex items-center gap-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Check size={14} />
                    <span>Crear</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryName("");
                      setNewCategoryError("");
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                  {newCategoryError && (
                    <span className="text-xs text-red-500 ml-1">{newCategoryError}</span>
                  )}
                </div>
              )}

              {/* Concept filter */}
              {uniqueUncategorized.length > 0 && (
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={conceptFilter}
                      onChange={(e) => setConceptFilter(e.target.value)}
                      placeholder="Filtrar por concepto..."
                      className="w-full text-sm border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {conceptFilter && (
                      <button
                        onClick={() => setConceptFilter("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {conceptFilter && (
                    <p className="text-xs text-slate-400 mt-1">
                      {filteredUniqueUncategorized.length} de {uniqueUncategorized.length} concepto{uniqueUncategorized.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {filteredUniqueUncategorized.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-slate-50 text-slate-500 font-mono text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedConcepts.size > 0 && selectedConcepts.size === filteredUniqueUncategorized.length}
                            onChange={() => {
                              if (selectedConcepts.size === filteredUniqueUncategorized.length) {
                                deselectAll();
                              } else {
                                selectAll();
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="py-2.5 px-4 font-semibold">Concepto</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Veces</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUniqueUncategorized.map((mov) => {
                        const concept = mov.concept;
                        const occurrences = uncategorizedMovements.filter(
                          (m) => m.concept.toLowerCase().trim() === concept.toLowerCase().trim()
                        );
                        const totalAmount = occurrences.reduce((sum, m) => sum + Math.abs(m.amount), 0);
                        const totalCents = Math.round(totalAmount * 100);

                        return (
                          <tr
                            key={concept}
                            className={`hover:bg-slate-50/50 transition-colors ${
                              selectedConcepts.has(concept) ? "bg-indigo-50/50" : ""
                            }`}
                          >
                            <td className="py-2.5 px-4">
                              <input
                                type="checkbox"
                                checked={selectedConcepts.has(concept)}
                                onChange={() => toggleSelectConcept(concept)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate" title={concept}>
                              {concept}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                              {occurrences.length}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                              {formatCentsToEuro(totalCents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  {conceptFilter ? (
                    <>
                      <p className="text-sm font-medium text-slate-600">
                        Ningún concepto coincide con "{conceptFilter}"
                      </p>
                      <button
                        onClick={() => setConceptFilter("")}
                        className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                      >
                        Limpiar filtro
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-full bg-emerald-50 text-emerald-500 inline-flex mb-3">
                        <Check size={24} />
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        ¡Todos los movimientos están categorizados!
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Las reglas que has creado se guardan automáticamente y se aplicarán en futuras importaciones.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Custom categories management */}
              {customCategories.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Edit3 size={12} />
                    <span>Tus categorías personalizadas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map((cat) => (
                      <div
                        key={cat}
                        className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                      >
                        <span>{cat}</span>
                        <button
                          onClick={() => removeCustomCategory(cat)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title={`Eliminar "${cat}"`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Al eliminar una categoría personalizada también se eliminan las reglas que la usan.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 mt-3">
                <strong>Consejo:</strong> Selecciona uno o varios conceptos similares, elige una categoría y haz clic en "Aplicar".
                La regla se guardará automáticamente y se aplicará en futuras importaciones.
                También puedes crear tus propias categorías con el botón <strong>+</strong>.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};