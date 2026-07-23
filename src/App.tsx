import { useState, useEffect } from "react";
import { db } from "./database/database";
import { type BankMovement, type GlobalImportResult } from "./types/movement";
import { deleteMovementsBySourceFileName, getImportedSourceFileNames, processMultipleFiles } from "./services/importService";
import { getCurrentSession, logout, type UserProfile } from "./services/authService";
import { MovementSummary } from "./components/MovementSummary";
import { ImportButton } from "./components/ImportButton";
import { ImportSummary } from "./components/ImportSummary";
import { MovementTable } from "./components/MovementTable";
import { SavingsHistory } from "./components/SavingsHistory";
import { IncomeVsExpensesChart } from "./components/IncomeVsExpensesChart";
import { ExpenseAnalysis, type CategoryFilter } from "./components/ExpenseAnalysis";
import { LoginScreen } from "./components/LoginScreen";
import { useUserCategoryRules } from "./hooks/useUserCategoryRules";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { summarizeAccountTotalsByBank, sumNetTotals } from "./utils/n26AccountUtils";
import { normalizeAccountOwnerToAlias } from "./utils/textUtils";
import { buildMonthlySavingsHistory } from "./utils/savingsHistory";
import { Wallet, Menu, LogOut } from "lucide-react";

export default function App() {
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [importSummary, setImportSummary] = useState<GlobalImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter | null>(null);
  const [monthlyTargetCents, setMonthlyTargetCents] = useState<number>(() => {
    const saved = localStorage.getItem("monthlyTargetCents");
    return saved ? parseInt(saved, 10) : 200000;
  });

  // Auth state
  const [session, setSession] = useState<UserProfile | null>(() => getCurrentSession());

  const handleLoginSuccess = (profile: UserProfile) => {
    setSession(profile);
  };

  const handleLogout = () => {
    logout();
    setSession(null);
    setMovements([]);
    setImportSummary(null);
    setCategoryFilter(null);
  };

  // Inactivity logout (15 minutes)
  useInactivityLogout(15 * 60 * 1000, handleLogout);

  // Load all saved movements from IndexedDB on startup (only when authenticated)
  const loadMovements = async () => {
    if (!session) return;
    try {
      const all = await db.movements.toArray();
      const normalizedMovements = all.map((movement) => {
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

      setMovements(normalizedMovements);
    } catch (err) {
      console.error("Error cargando movimientos de IndexedDB:", err);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [session]);

  // Show login screen if not authenticated
  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Handle file uploads
  const handleFilesSelected = async (files: FileList) => {
    setIsProcessing(true);
    try {
      const fileArray = Array.from(files);
      const result = await processMultipleFiles(fileArray);
      setImportSummary(result);
      await loadMovements();
    } catch (err) {
      console.error("Error al procesar los archivos:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear database
  const handleClearDatabase = async () => {
    try {
      await db.movements.clear();
      setImportSummary(null);
      await loadMovements();
    } catch (err) {
      console.error("Error al vaciar la base de datos:", err);
    }
  };

  const handleRemoveFileData = async (fileName: string) => {
    try {
      await deleteMovementsBySourceFileName(fileName);
      setImportSummary(null);
      await loadMovements();
    } catch (err) {
      console.error("Error al borrar los movimientos del fichero:", err);
    }
  };

  // Close the import result panel
  const handleCloseSummary = () => {
    setImportSummary(null);
  };

  // Update the monthly savings target (persisted in localStorage)
  const handleMonthlyTargetChange = (euros: number) => {
    const cents = Math.round(euros * 100);
    setMonthlyTargetCents(cents);
    localStorage.setItem("monthlyTargetCents", cents.toString());
  };

  // Safely calculate net totals in cents to avoid floats errors
  const totalCount = movements.length;
  const initialN26MoiBalanceCents = 23303;
  const initialN26ManuBalanceCents = 8565;
  const initialSabadellMoiBalanceCents = 4925520;
  const initialSabadellManuBalanceCents = 329;
  const initialUnicajaBalanceCents = 209821;
  const startDate = "2026-07-01";
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
    "2026-07-01",
    "2026-12-31",
    sumNetTotals(initialN26MoiBalanceCents, initialN26ManuBalanceCents, initialSabadellMoiBalanceCents, initialSabadellManuBalanceCents, initialUnicajaBalanceCents),
    globalNetCents
  );

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col">
      {/* Top Navigation / Header */}
      <header id="app-header" className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet size={20} />
            </div>
            <div>
              <h1 id="main-title" className="text-base font-sans font-bold text-slate-900 tracking-tight">
                Control financiero del hogar
              </h1>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Unificador de extractos bancarios
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Local Storage / IndexedDB Activo</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="btn-open-sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
                title="Abrir menú de administración"
              >
                <Menu size={18} />
                <span>Importar / Ajustes</span>
              </button>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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
          importedFileNames={getImportedSourceFileNames(movements)}
          isProcessing={isProcessing}
        />

        {/* Latest Import Session Results Summary */}
        <ImportSummary
          summary={importSummary}
          onClose={handleCloseSummary}
        />

        {/* Savings history section */}
        <SavingsHistory
          history={savingsHistory}
          monthlyTargetCents={monthlyTargetCents}
          onMonthlyTargetChange={handleMonthlyTargetChange}
        />

        {/* Income vs Expenses Chart */}
        <IncomeVsExpensesChart movements={movements} />

        {/* Expense Analysis Section */}
        <ExpenseAnalysis
          movements={movements}
          onCategorySelect={setCategoryFilter}
        />

        {/* Master Transactions List Table */}
        <MovementTable
          movements={movements}
          categoryFilter={categoryFilter}
          onClearCategoryFilter={() => setCategoryFilter(null)}
        />

      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <p>© 2026 Control Financiero del Hogar. Todo procesado de forma local y segura.</p>
      </footer>
    </div>
  );
}
