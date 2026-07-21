import { useState, useEffect } from "react";
import { db } from "./database/database";
import { type BankMovement, type GlobalImportResult } from "./types/movement";
import { processMultipleFiles } from "./services/importService";
import { MovementSummary } from "./components/MovementSummary";
import { ImportButton } from "./components/ImportButton";
import { ImportSummary } from "./components/ImportSummary";
import { MovementTable } from "./components/MovementTable";
import { Wallet, Menu } from "lucide-react";

export default function App() {
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [importSummary, setImportSummary] = useState<GlobalImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load all saved movements from IndexedDB on startup
  const loadMovements = async () => {
    try {
      const all = await db.movements.toArray();
      setMovements(all);
    } catch (err) {
      console.error("Error cargando movimientos de IndexedDB:", err);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

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

  // Close the import result panel
  const handleCloseSummary = () => {
    setImportSummary(null);
  };

  // Safely calculate net totals in cents to avoid floats errors
  const totalCount = movements.length;
  let globalNetCents = 0;
  let n26NetCents = 0;
  let unicajaNetCents = 0;
  let sabadellNetCents = 0;

  for (const m of movements) {
    const cents = Math.round(m.amount * 100);
    globalNetCents += cents;
    if (m.bank === "N26") {
      n26NetCents += cents;
    } else if (m.bank === "Unicaja") {
      unicajaNetCents += cents;
    } else if (m.bank === "Sabadell") {
      sabadellNetCents += cents;
    }
  }

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
                Unificador de extractos bancarios MVP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Local Storage / IndexedDB Activo</span>
            </div>
            <button
              id="btn-open-sidebar"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer"
              title="Abrir menú de administración"
            >
              <Menu size={18} />
              <span>Importar / Ajustes</span>
            </button>
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
          unicajaNetCents={unicajaNetCents}
          sabadellNetCents={sabadellNetCents}
        />

        {/* File Drag Zone & Actions Panel (Sidebar Drawer) */}
        <ImportButton
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onFilesSelected={handleFilesSelected}
          onClearDatabase={handleClearDatabase}
          isProcessing={isProcessing}
        />

        {/* Latest Import Session Results Summary */}
        <ImportSummary
          summary={importSummary}
          onClose={handleCloseSummary}
        />

        {/* Master Transactions List Table */}
        <MovementTable
          movements={movements}
        />

      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
        <p>© 2026 Control Financiero del Hogar MVP. Todo procesado de forma local y segura.</p>
      </footer>
    </div>
  );
}
