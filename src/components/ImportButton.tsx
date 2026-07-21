import React, { useRef, useState } from "react";
import { Upload, Trash2, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImportButtonProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList) => void;
  onClearDatabase: () => void;
  isProcessing: boolean;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  onClearDatabase,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input so same file can be imported again
      }
      onClose(); // Automatically close drawer after selecting files to show results
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isProcessing && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
      onClose(); // Automatically close drawer after dropping files
    }
  };

  const triggerFileInput = () => {
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearClick = () => {
    setShowConfirmClear(true);
  };

  const confirmClear = () => {
    setShowConfirmClear(false);
    onClearDatabase();
    onClose(); // Close drawer after clearing
  };

  const cancelClear = () => {
    setShowConfirmClear(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            id="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 cursor-pointer"
          />

          {/* Lateral Sliding Panel */}
          <motion.div
            id="sidebar-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-sans font-bold text-slate-900 tracking-tight">
                  Acciones de administración
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono uppercase tracking-wider">
                  Importar y Configurar
                </p>
              </div>
              <button
                id="btn-close-sidebar"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                title="Cerrar panel"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* File Drag and Drop Zone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Cargar extractos bancarios
                </label>
                <div
                  id="dropzone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
                  } ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <input
                    id="file-uploader-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv,.xls,.xlsx"
                    multiple
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="p-3 bg-white rounded-full border border-slate-200 shadow-xs mb-3 text-indigo-500">
                    <Upload size={22} className={isProcessing ? "animate-bounce" : ""} />
                  </div>
                  <p className="text-sm font-sans font-medium text-slate-700 text-center">
                    {isProcessing ? "Procesando..." : "Haz clic para seleccionar o arrastra tus ficheros aquí"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 text-center">
                    Formatos admitidos: .csv, .xls, .xlsx (N26, Unicaja, Sabadell)
                  </p>
                </div>
              </div>

              {/* Action Buttons Box */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <button
                  id="btn-import-trigger"
                  type="button"
                  onClick={triggerFileInput}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-xl shadow-xs text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Upload size={16} className="mr-2" />
                  Importar movimientos
                </button>

                {!showConfirmClear ? (
                  <button
                    id="btn-clear-db"
                    type="button"
                    onClick={handleClearClick}
                    disabled={isProcessing}
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-rose-200 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50/30 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Vaciar todos los datos
                  </button>
                ) : (
                  <div id="confirm-clear-box" className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/60 flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-start">
                      <AlertCircle size={16} className="text-rose-600 mr-2 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-rose-800">
                        ¿Seguro que deseas borrar todos los movimientos? Esta acción es irreversible y limpiará la base de datos IndexedDB.
                      </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        id="btn-confirm-clear-yes"
                        onClick={confirmClear}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        Sí, borrar todo
                      </button>
                      <button
                        id="btn-confirm-clear-no"
                        onClick={cancelClear}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-center text-[10px] text-slate-400">
              Procesamiento 100% local en tu navegador
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
