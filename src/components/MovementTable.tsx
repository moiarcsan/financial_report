import React, { useState, useMemo } from "react";
import { type BankMovement } from "../types/movement";
import { formatDateToSpanish } from "../utils/dateUtils";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { categorizeConcept, isBalanceTransfer, CATEGORY_COLORS } from "../utils/categoryUtils";
import { useUserCategoryRules, getAllAssignableCategories, getAllCategoryColors } from "../hooks/useUserCategoryRules";
import { type CategoryFilter } from "./ExpenseAnalysis";
import { Calendar, Tag, CreditCard, Search, X, Filter, Check, Edit3 } from "lucide-react";

interface MovementTableProps {
  movements: BankMovement[];
  categoryFilter?: CategoryFilter | null;
  onClearCategoryFilter?: () => void;
}

/**
 * A single table row that shows the movement details and an editable category selector.
 */
const CategoryEditableRow: React.FC<{
  mov: BankMovement;
  rules: Map<string, string>;
  addRule: (keyword: string, category: string) => void;
  assignableCategories: string[];
  getBankBadgeClass: (bank: "N26" | "Unicaja" | "Sabadell") => string;
  formatDateToSpanish: (date: string) => string;
  formatCentsToEuro: (cents: number) => string;
  categoryColors: Record<string, string>;
}> = ({ mov, rules, addRule, assignableCategories, getBankBadgeClass, formatDateToSpanish, formatCentsToEuro, categoryColors }) => {
  const [editing, setEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(() => categorizeConcept(mov.concept, rules));
  const [saved, setSaved] = useState(false);

  const amountCents = Math.round(mov.amount * 100);
  const isPositive = amountCents >= 0;

  // Update displayed category when rules change (e.g., after saving)
  const displayCategory = editing ? selectedCategory : categorizeConcept(mov.concept, rules);

  const handleSave = () => {
    // Only save if the category actually changed from the auto-detected one
    addRule(mov.concept, selectedCategory);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setSelectedCategory(categorizeConcept(mov.concept, rules));
    setEditing(false);
  };

  return (
    <tr
      key={mov.id}
      id={`row-${mov.id}`}
      className="hover:bg-slate-50/50 transition-colors duration-150"
    >
      {/* Fecha */}
      <td className="py-2 px-2 whitespace-nowrap text-slate-600 font-sans text-xs">
        {formatDateToSpanish(mov.operationDate)}
      </td>

      {/* Fecha Valor */}
      <td className="py-2 px-2 whitespace-nowrap text-slate-400 font-sans text-xs">
        {mov.valueDate ? formatDateToSpanish(mov.valueDate) : "-"}
      </td>

      {/* Banco */}
      <td className="py-2 px-2 whitespace-nowrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold rounded-md border ${getBankBadgeClass(mov.bank)}`}>
          {mov.bank}
        </span>
      </td>

      {/* Cuenta */}
      <td className="py-2 px-2 whitespace-nowrap text-slate-600 font-sans text-xs truncate" title={mov.account}>
        <span className="flex items-center">
          <CreditCard size={12} className="text-slate-400 mr-1 shrink-0" />
          <span className="truncate">{mov.account}</span>
        </span>
      </td>

      {/* Concepto */}
      <td className="py-2 px-2 truncate text-slate-700 font-medium font-sans" title={mov.concept}>
        <span className="flex items-center">
          <Tag size={12} className="text-slate-400 mr-1.5 shrink-0" />
          <span className="truncate">{mov.concept}</span>
        </span>
      </td>

      {/* Categoría editable */}
      <td className="py-2 px-2 whitespace-nowrap">
        {editing ? (
          <div className="flex items-center gap-1">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white max-w-[140px]"
              autoFocus
            >
              {assignableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Guardar categoría"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-rose-400 hover:bg-rose-50 rounded transition-colors"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {saved ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                <Check size={10} />
                Guardado
              </span>
            ) : (
              <>
                <span
                  className="text-xs font-medium px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: categoryColors[displayCategory] || "#f1f5f9",
                    color: categoryColors[displayCategory] ? "#ffffff" : "#475569",
                    border: `1px solid ${categoryColors[displayCategory] ? `${categoryColors[displayCategory]}88` : "#e2e8f0"}`,
                  }}
                >
                  {displayCategory}
                </span>
                <button
                  onClick={() => {
                    setSelectedCategory(displayCategory);
                    setEditing(true);
                  }}
                  className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                  title="Cambiar categoría"
                >
                  <Edit3 size={12} />
                </button>
              </>
            )}
          </div>
        )}
      </td>

      {/* Importe */}
      <td className={`py-2 px-2 text-right whitespace-nowrap font-semibold font-sans text-xs ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
        {isPositive ? "+" : ""}
        {formatCentsToEuro(amountCents)}
      </td>
    </tr>
  );
};

interface Filters {
  dateFrom: string;
  dateTo: string;
  valueDate: string;
  bank: string;
  account: string;
  concept: string;
  amountMin: string;
  amountMax: string;
}

export const MovementTable: React.FC<MovementTableProps> = ({ movements, categoryFilter, onClearCategoryFilter }) => {
  const { rules, addRule, customCategories, customCategoryColors } = useUserCategoryRules();
  const categoryColors = getAllCategoryColors(customCategories, customCategoryColors);
  const [filters, setFilters] = useState<Filters>({
    dateFrom: "",
    dateTo: "",
    valueDate: "",
    bank: "",
    account: "",
    concept: "",
    amountMin: "",
    amountMax: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setCurrentPage(1);
    setFilters({
      dateFrom: "",
      dateTo: "",
      valueDate: "",
      bank: "",
      account: "",
      concept: "",
      amountMin: "",
      amountMax: "",
    });
  };

  // Sort by date descending (most recent first)
  const sortedMovements = [...movements].sort((a, b) => {
    const dateCompare = b.operationDate.localeCompare(a.operationDate);
    if (dateCompare !== 0) return dateCompare;
    // Fallback sort: latest imported first, then higher absolute amount
    const importedCompare = b.importedAt.localeCompare(a.importedAt);
    if (importedCompare !== 0) return importedCompare;
    return Math.abs(b.amount) - Math.abs(a.amount);
  });

  // Filter movements based on filter values + category filter
  const filteredMovements = useMemo(() => {
    return sortedMovements.filter((mov) => {
      // Category + month filter
      if (categoryFilter) {
        const isExpense = Math.round(mov.amount * 100) < 0;
        if (!isExpense) return false;
        if (isBalanceTransfer(mov.concept)) return false;
        const movCategory = categorizeConcept(mov.concept, rules);
        if (movCategory !== categoryFilter.category) return false;
        // Match the selected month
        if (!mov.operationDate.startsWith(categoryFilter.month)) return false;
      }

      // Date range filter (operation date)
      const dateFromMatch = filters.dateFrom === "" || mov.operationDate >= filters.dateFrom;
      const dateToMatch = filters.dateTo === "" || mov.operationDate <= filters.dateTo;

      // Value date filter (substring match)
      const valDateMatch = filters.valueDate === "" ||
        (mov.valueDate ? mov.valueDate.includes(filters.valueDate) : false);

      // Bank filter (case-insensitive substring)
      const bankMatch = filters.bank === "" ||
        mov.bank.toLowerCase().includes(filters.bank.toLowerCase());

      // Account filter (case-insensitive substring)
      const accountMatch = filters.account === "" ||
        mov.account.toLowerCase().includes(filters.account.toLowerCase());

      // Concept filter (case-insensitive substring)
      const conceptMatch = filters.concept === "" ||
        mov.concept.toLowerCase().includes(filters.concept.toLowerCase());

      // Amount comparison filters
      const amountMinMatch = filters.amountMin === "" ||
        mov.amount >= parseFloat(filters.amountMin);
      const amountMaxMatch = filters.amountMax === "" ||
        mov.amount <= parseFloat(filters.amountMax);

      return dateFromMatch && dateToMatch && valDateMatch && bankMatch && accountMatch && conceptMatch && amountMinMatch && amountMaxMatch;
    });
  }, [sortedMovements, filters, categoryFilter]);

  // Calculate sum of filtered movements in cents
  const filteredSumCents = useMemo(() => {
    return filteredMovements.reduce((sum, mov) => sum + Math.round(mov.amount * 100), 0);
  }, [filteredMovements]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "") || !!categoryFilter;

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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMovements = filteredMovements.slice(startIndex, startIndex + pageSize);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // Reset page when page size changes
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div id="movements-table-container" className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-sans font-semibold text-slate-800">
          Listado de movimientos unificados
        </h3>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => {
                clearAllFilters();
                onClearCategoryFilter?.();
              }}
              className="inline-flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              title="Limpiar todos los filtros"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          )}
          <span className="text-xs font-sans px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {filteredMovements.length} transacciones
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-8 gap-3">
        {/* Date Range - From */}
        <div className="relative">
          <input
            type="date"
            placeholder="Fecha desde"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Calendar size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Date Range - To */}
        <div className="relative">
          <input
            type="date"
            placeholder="Fecha hasta"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Calendar size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Value Date */}
        <div className="relative">
          <input
            type="text"
            placeholder="Fecha valor"
            value={filters.valueDate}
            onChange={(e) => handleFilterChange("valueDate", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Calendar size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Bank */}
        <div className="relative">
          <input
            type="text"
            placeholder="Banco"
            value={filters.bank}
            onChange={(e) => handleFilterChange("bank", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Account */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cuenta"
            value={filters.account}
            onChange={(e) => handleFilterChange("account", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <CreditCard size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Concept */}
        <div className="relative">
          <input
            type="text"
            placeholder="Concepto"
            value={filters.concept}
            onChange={(e) => handleFilterChange("concept", e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Tag size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Amount Min (>=) */}
        <div className="relative">
          <input
            type="number"
            step="0.01"
            placeholder="Importe ≥"
            value={filters.amountMin}
            onChange={(e) => handleFilterChange("amountMin", e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Amount Max (<=) */}
        <div className="relative">
          <input
            type="number"
            step="0.01"
            placeholder="Importe ≤"
            value={filters.amountMax}
            onChange={(e) => handleFilterChange("amountMax", e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 text-xs font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filteredMovements.length === 0 ? (
        <div id="empty-state-message" className="p-16 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-full bg-slate-50 text-slate-400 mb-3">
            <Calendar size={32} />
          </div>
          <p className="text-base font-sans font-medium text-slate-600">
            {hasActiveFilters
              ? "No se encontraron movimientos con esos filtros."
              : "Todavía no hay movimientos importados."}
          </p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            {hasActiveFilters
              ? "Intenta ajustar los filtros o haz clic en 'Limpiar filtros'."
              : "Selecciona uno o varios ficheros de extractos bancarios de N26, Unicaja o Sabadell para verlos unificados aquí."}
          </p>
        </div>
      ) : (
        <>
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/75 text-slate-500 font-sans text-[11px] uppercase tracking-wider border-b border-slate-100">
                <th className="py-2 px-2 font-semibold">Fecha</th>
                <th className="py-2 px-2 font-semibold">Valor</th>
                <th className="py-2 px-2 font-semibold">Banco</th>
                <th className="py-2 px-2 font-semibold">Cuenta</th>
                <th className="py-2 px-2 font-semibold">Concepto</th>
                <th className="py-2 px-2 font-semibold">Categoría</th>
                <th className="py-2 px-2 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {paginatedMovements.map((mov) => (
                <CategoryEditableRow
                  key={mov.id}
                  mov={mov}
                  rules={rules}
                  addRule={addRule}
                  assignableCategories={getAllAssignableCategories(customCategories)}
                  getBankBadgeClass={getBankBadgeClass}
                  formatDateToSpanish={formatDateToSpanish}
                  formatCentsToEuro={formatCentsToEuro}
                  categoryColors={categoryColors}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="border-t-2 border-slate-200 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-sans text-slate-500">
                Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredMovements.length)} de {filteredMovements.length} movimientos
              </span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-xs font-sans border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Primera página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7"></polyline>
                  <polyline points="18 17 13 12 18 7"></polyline>
                </svg>
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <span className="text-xs font-sans text-slate-600 px-3">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página siguiente"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Última página"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7"></polyline>
                  <polyline points="6 17 11 12 6 7"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
