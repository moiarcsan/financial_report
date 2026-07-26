import { useState, useEffect, useMemo, useCallback } from "react";
import { type BankMovement, type GlobalImportResult } from "./types/movement";
import { processMultipleFiles } from "./services/importService";
import { getCurrentSession, logout, type UserProfile } from "./services/authService";
import { MovementSummary } from "./components/MovementSummary";
import { ImportButton } from "./components/ImportButton";
import { ImportSummary } from "./components/ImportSummary";
import { MovementTable } from "./components/MovementTable";
import { SavingsHistory } from "./components/SavingsHistory";
import { IncomeVsExpensesChart } from "./components/IncomeVsExpensesChart";
import { ExpenseAnalysis, type CategoryFilter } from "./components/ExpenseAnalysis";
import { LoginScreen } from "./components/LoginScreen";
import { BalanceEvolutionChart } from "./components/BalanceEvolutionChart";
import { FinancialKPIs } from "./components/FinancialKPIs";
import { useSupabaseSync } from "./hooks/useSupabaseSync";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { summarizeAccountTotalsByBank, sumNetTotals } from "./utils/n26AccountUtils";
import { normalizeAccountOwnerToAlias } from "./utils/textUtils";
import { buildMonthlySavingsHistory } from "./utils/savingsHistory";
import { Wallet, Menu, LogOut, Loader2 } from "lucide-react";

export default function App() {
  // All useState hooks first
  const [importSummary, setImportSummary] = useState<GlobalImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(null);
  const [monthlyTargetCents, setMonthlyTargetCents] = useState<number>(() => {
    const saved = localStorage.getItem("monthlyTargetCents");
    return saved ? parseInt(saved, 10) : 200000;
  });
  const [session, setSession] = useState<UserProfile | null>(null);

  // All custom hooks next (in the same order every render)
  const {
    movements: supabaseMovements,
    categoryRules,
    customCategories,
    customCategoryColors,
    isLoading: isSyncLoading,
    error: syncError,
    isSupabaseAvailable,
    deleteMovementsByFile,
    clearMovements,
    refreshData,
  } = useSupabaseSync(session?.id || null);

  // All useEffect hooks
  useEffect(() => {
    const existingSession = getCurrentSession();
    if (existingSession) {
      setSession(existingSession);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseAvailable && session) {
      console.warn("Supabase not available, clearing session");
      logout();
      setSession(null);
    }
  }, [isSupabaseAvailable, session]);

  // All useCallback hooks
  const handleLoginSuccess = useCallback((profile: UserProfile) => {
    setSession(profile);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setSession(null);
    setImportSummary(null);
    setCategoryFilter(null);
  }, []);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    try {
      const fileArray = Array.from(files);
      const result = await processMultipleFiles(fileArray, session?.id);
      setImportSummary(result);
      await refreshData();
    } catch (err) {
      console.error("Error al procesar los archivos:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [session?.id, refreshData]);

  const handleClearDatabase = useCallback(async () => {
    try {
      await clearMovements();
      setImportSummary(null);
    } catch (err) {
      console.error("Error al vaciar la base de datos:", err);
    }
  }, [clearMovements]);

  const handleRemoveFileData = useCallback(async (fileName: string) => {
    try {
      await deleteMovementsByFile(fileName);
      setImportSummary(null);
    } catch (err) {
      console.error("Error al borrar los movimientos del fichero:", err);
    }
  }, [deleteMovementsByFile]);

  const handleCloseSummary = useCallback(() => {
    setImportSummary(null);
  }, []);

  const handleMonthlyTargetChange = useCallback((euros: number) => {
    const cents = Math.round(euros * 100);
    setMonthlyTargetCents(cents);
    localStorage.setItem("monthlyTargetCents", cents.toString());
  }, []);

  // useInactivityLogout hook
  useInactivityLogout(15 * 60 * 1000, handleLogout);

  // All useMemo hooks
  const movements = useMemo(() => {
    return supabaseMovements.map((movement) => {
      if (movement.bank === "Unicaja") {
        return {
          ...movement,
          account: "Cuenta M&M",
        };
      }

      if (movement.bank === "Sabadell") {
        return {
          ...movement,
          account: normalizeAccountOwnerToAlias(movement.account),
        };
      }

      return movement;
    });
  }, [supabaseMovements]);

  const importedFileNames = useMemo(() => {
    return Array.from(new Set(movements.map((m) => m.sourceFileName)));
  }, [movements]);

  // Show login screen if not authenticated
  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Show loading state while syncing with Supabase
  if (isSyncLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando datos desde Supabase...</p>
        </div>
      </div>
    );
  }

  // Show error state if Supabase is not available
  if (syncError && !isSupabaseAvailable) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet size={32} />
          </div>
          <h2 className="text-xl font-sans font-bold text-slate-900 mb-2">Error de conexión</h2>
          <p className="text-sm text-slate-600 mb-4">{syncError}</p>
          <p className="text-xs text-slate-500">
            Asegúrate de que las tablas de Supabase están creadas y las credenciales son correctas.
          </p>
        </div>
      </div>
    );
  }

  // Safely calculate net totals in cents to avoid floats errors
  const totalCount = movements.length;
  const initialN26MoiBalanceCents = 0;
  const initialN26ManuBalanceCents = 0;
  const initialSabadellMoiBalanceCents = 0;
  const initialSabadellManuBalanceCents = 5084374; // Sabadell Manu (corriente + ahorro) a 01/01/2026
  const initialUnicajaBalanceCents = 1349657;    // Unicaja a 01/01/2026
  const startDate = "2026-01-01";
  let n26NetCents = initialN26MoiBalanceCents + initialN26ManuBalanceCents;
  let unicajaNetCents = initialUnicajaBalanceCents;
  let sabadellNetCents = initialSabadellMoiBalanceCents + initialSabadellManuBalanceCents;

  const n26AccountTotals = summarizeAccountTotalsByBank(movements, "N26");
  const sabadellAccountTotals = summarizeAccountTotalsByBank(movements, "Sabadell");
  const unicajaAccountTotals = summarizeAccountTotalsByBank(movements, "Unicaja");
  const n26AccountTotalsWithInitial = { ...n26AccountTotals };
  const sabadellAccountTotalsWithInitial = { ...sabadellAccountTotals };
  const unicajaAccountTotalsWithInitial = { ...unicajaAccountTotals };

  const moiAccountName = Object.keys(n26AccountTotalsWithInitial).find((accountName) =>
    ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(accountName)
  );
  const manuAccountName = Object.keys(n26AccountTotalsWithInitial).find((accountName) =>
    ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(accountName)
  );
  const sabadellMoiAccountName = Object.keys(sabadellAccountTotalsWithInitial).find((accountName) =>
    ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(accountName)
  );
  const sabadellManuAccountName = Object.keys(sabadellAccountTotalsWithInitial).find((accountName) =>
    ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(accountName)
  );
  const unicajaAccountName = Object.keys(unicajaAccountTotalsWithInitial).find((accountName) =>
    ["Cuenta M&M", "M&M", "Cuenta m&m", "m&m"].includes(accountName)
  );

  const moiAccountKey = moiAccountName || "Cuenta Moi";
  const manuAccountKey = manuAccountName || "Cuenta Manu";
  const sabadellMoiAccountKey = sabadellMoiAccountName || "Cuenta Moi";
  const sabadellManuAccountKey = sabadellManuAccountName || "Cuenta Manu";
  const unicajaAccountKey = unicajaAccountName || "Cuenta M&M";

  for (const m of movements) {
    const cents = Math.round(m.amount * 100);
    const isN26MoiAccount = m.bank === "N26" && ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(m.account);
    const isN26ManuAccount = m.bank === "N26" && ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(m.account);
    const isSabadellMoiAccount = m.bank === "Sabadell" && ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(m.account);
    const isSabadellManuAccount = m.bank === "Sabadell" && ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(m.account);
    const isAfterInitialDate = m.operationDate >= startDate;

    if (m.bank === "N26") {
      if (isN26MoiAccount && isAfterInitialDate) {
        n26NetCents += cents;
      }
      if (isN26ManuAccount && isAfterInitialDate) {
        n26NetCents += cents;
      }
    } else if (m.bank === "Unicaja") {
      if (isAfterInitialDate) {
        unicajaNetCents += cents;
      }
    } else if (m.bank === "Sabadell") {
      if (isSabadellMoiAccount && isAfterInitialDate) {
        sabadellNetCents += cents;
      }
      if (isSabadellManuAccount && isAfterInitialDate) {
        sabadellNetCents += cents;
      }
    }
  }

  n26AccountTotalsWithInitial[moiAccountKey] = initialN26MoiBalanceCents;
  n26AccountTotalsWithInitial[manuAccountKey] = initialN26ManuBalanceCents;
  sabadellAccountTotalsWithInitial[sabadellMoiAccountKey] = initialSabadellMoiBalanceCents;
  sabadellAccountTotalsWithInitial[sabadellManuAccountKey] = initialSabadellManuBalanceCents;
  unicajaAccountTotalsWithInitial[unicajaAccountKey] = initialUnicajaBalanceCents;

  for (const m of movements) {
    const cents = Math.round(m.amount * 100);
    const isN26MoiAccount = m.bank === "N26" && ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(m.account);
    const isN26ManuAccount = m.bank === "N26" && ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(m.account);
    const isSabadellMoiAccount = m.bank === "Sabadell" && ["Cuenta Moi", "Moi", "Cuenta moi", "moi"].includes(m.account);
    const isSabadellManuAccount = m.bank === "Sabadell" && ["Cuenta Manu", "Manu", "Cuenta manu", "manu"].includes(m.account);
    const isAfterInitialDate = m.operationDate >= startDate;

    if (isN26MoiAccount && isAfterInitialDate) {
      n26AccountTotalsWithInitial[moiAccountKey] = (n26AccountTotalsWithInitial[moiAccountKey] || 0) + cents;
    }

    if (isN26ManuAccount && isAfterInitialDate) {
      n26AccountTotalsWithInitial[manuAccountKey] = (n26AccountTotalsWithInitial[manuAccountKey] || 0) + cents;
    }

    if (isSabadellMoiAccount && isAfterInitialDate) {
      sabadellAccountTotalsWithInitial[sabadellMoiAccountKey] = (sabadellAccountTotalsWithInitial[sabadellMoiAccountKey] || 0) + cents;
    }

    if (isSabadellManuAccount && isAfterInitialDate) {
      sabadellAccountTotalsWithInitial[sabadellManuAccountKey] = (sabadellAccountTotalsWithInitial[sabadellManuAccountKey] || 0) + cents;
    }

    if (m.bank === "Unicaja" && isAfterInitialDate) {
      unicajaAccountTotalsWithInitial[unicajaAccountKey] = (unicajaAccountTotalsWithInitial[unicajaAccountKey] || 0) + cents;
    }
  }

  const globalNetCents = sumNetTotals(n26NetCents, unicajaNetCents, sabadellNetCents);
  const savingsHistory = buildMonthlySavingsHistory(
    movements.map((movement) => ({ operationDate: movement.operationDate, amount: movement.amount })),
    "2026-01-01",
    "2026-12-31",
    sumNetTotals(initialN26MoiBalanceCents, initialN26ManuBalanceCents, initialSabadellMoiBalanceCents, initialSabadellManuBalanceCents, initialUnicajaBalanceCents),
    globalNetCents
  );

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col">
      {/* Top Navigation / Header */}
      <header id="app-header" className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-xl shrink-0">
              <Wallet size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 id="main-title" className="text-xs sm:text-base font-sans font-bold text-slate-900 tracking-tight truncate">
                Control financiero
              </h1>
              <p className="text-[8px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden sm:block">
                Unificador de extractos bancarios
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Conectado a Supabase</span>
            </div>
            {syncError && (
              <div className="text-xs text-rose-600 font-medium hidden sm:block">
                Error: {syncError}
              </div>
            )}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="btn-open-sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                title="Abrir menú de administración"
              >
                <Menu size={16} className="sm:w-4.5 sm:h-4.5" />
                <span className="hidden sm:inline">Importar / Ajustes</span>
                <span className="inline sm:hidden">Importar</span>
              </button>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={16} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
        
        {/* Real-time Financial Summary Cards */}
        <MovementSummary
          totalCount={totalCount}
          globalNetCents={globalNetCents}
          n26NetCents={n26NetCents}
          n26AccountTotals={n26AccountTotalsWithInitial}
          unicajaNetCents={unicajaNetCents}
          sabadellNetCents={sabadellNetCents}
          sabadellAccountTotals={sabadellAccountTotalsWithInitial}
          unicajaAccountTotals={unicajaAccountTotalsWithInitial}
        />

        {/* File Drag Zone & Actions Panel (Sidebar Drawer) */}
        <ImportButton
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onFilesSelected={handleFilesSelected}
          onClearDatabase={handleClearDatabase}
          onRemoveFileData={handleRemoveFileData}
          importedFileNames={importedFileNames}
          isProcessing={isProcessing}
        />

        {/* Latest Import Session Results Summary */}
        <ImportSummary
          summary={importSummary}
          onClose={handleCloseSummary}
        />

        {/* Financial KPIs */}
        <FinancialKPIs
          movements={movements}
          initialBalanceCents={sumNetTotals(
            initialN26MoiBalanceCents,
            initialN26ManuBalanceCents,
            initialSabadellMoiBalanceCents,
            initialSabadellManuBalanceCents,
            initialUnicajaBalanceCents
          )}
          currentBalanceCents={globalNetCents}
          userRules={categoryRules}
        />

        {/* Balance Evolution Chart */}
        <BalanceEvolutionChart
          movements={movements}
          initialBalanceCents={sumNetTotals(
            initialN26MoiBalanceCents,
            initialN26ManuBalanceCents,
            initialSabadellMoiBalanceCents,
            initialSabadellManuBalanceCents,
            initialUnicajaBalanceCents
          )}
          startDate={startDate}
          userRules={categoryRules}
        />

        {/* Savings history section */}
        <SavingsHistory
          history={savingsHistory}
          monthlyTargetCents={monthlyTargetCents}
          onMonthlyTargetChange={handleMonthlyTargetChange}
        />

        {/* Income vs Expenses Chart */}
        <IncomeVsExpensesChart userId={session?.id} movements={movements} />

        {/* Expense Analysis Section */}
        <ExpenseAnalysis
          userId={session?.id}
          movements={movements}
          onCategorySelect={setCategoryFilter}
        />

        {/* Master Transactions List Table */}
        <MovementTable
          userId={session?.id}
          movements={movements}
          categoryFilter={categoryFilter}
          onClearCategoryFilter={() => setCategoryFilter(null)}
        />

      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <p>© 2026 Control Financiero del Hogar. Todo sincronizado con Supabase.</p>
      </footer>
    </div>
  );
}