import React, { useState } from "react";
import { runTestSuite, type TestSuiteResult } from "../utils/testSuite";
import { Play, Check, AlertTriangle, ChevronDown, ChevronUp, Beaker } from "lucide-react";

export const TestSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    // Add artificial delay for professional feeling
    await new Promise((resolve) => setTimeout(resolve, 600));
    const results = await runTestSuite();
    setTestResults(results);
    setIsRunning(false);
    setIsExpanded(true);
  };

  return (
    <div id="test-suite-panel" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider font-mono flex items-center">
            <Beaker size={16} className="text-indigo-500 mr-2 shrink-0" />
            Control de Calidad (Sección 14 - Pruebas Mínimas)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ejecuta las pruebas automáticas del MVP sobre detección de bancos, conversión de datos, huellas y prevención de duplicados.
          </p>
        </div>

        <button
          id="btn-run-tests"
          onClick={handleRunTests}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold font-mono transition-all disabled:opacity-50 shadow-xs cursor-pointer"
        >
          <Play size={12} className="mr-1.5 text-indigo-500" />
          {isRunning ? "Probando..." : "Ejecutar Pruebas"}
        </button>
      </div>

      {testResults && (
        <div id="test-results-box" className="mt-5 animate-fadeIn">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                testResults.allPassed 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}>
                {testResults.allPassed ? "TODAS LAS PRUEBAS COMPLETADAS (OK)" : "ALGO HA FALLADO"}
              </span>
            </div>
            <button
              id="btn-toggle-tests-detail"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center cursor-pointer"
            >
              {isExpanded ? (
                <>Ocultar detalles <ChevronUp size={14} className="ml-1" /></>
              ) : (
                <>Mostrar detalles <ChevronDown size={14} className="ml-1" /></>
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="space-y-2 max-h-96 overflow-y-auto mt-2 border-t border-slate-200/60 pt-3">
              {testResults.results.map((r, i) => (
                <div
                  key={i}
                  id={`test-case-${i}`}
                  className="flex items-start justify-between p-3 rounded-xl bg-white border border-slate-200/50 text-xs"
                >
                  <div className="mr-4">
                    <p className="font-semibold text-slate-800">{r.name}</p>
                    {r.details && <p className="text-slate-400 mt-0.5">{r.details}</p>}
                    <div className="mt-1 flex gap-4 text-[11px] font-mono">
                      <span className="text-slate-400">Esperado: <span className="text-slate-600">{r.expected}</span></span>
                      <span className="text-slate-400">Obtenido: <span className={r.passed ? "text-emerald-600" : "text-rose-600"}>{r.actual}</span></span>
                    </div>
                  </div>
                  <div className={`p-1.5 rounded-full ${r.passed ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {r.passed ? <Check size={14} /> : <AlertTriangle size={14} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
