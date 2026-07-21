import React from "react";
import { formatCentsToEuro } from "../utils/moneyUtils";
import { TrendingUp, TrendingDown, Wallet, Building2 } from "lucide-react";

interface MovementSummaryProps {
  totalCount: number;
  globalNetCents: number;
  n26NetCents: number;
  unicajaNetCents: number;
  sabadellNetCents: number;
}

export const MovementSummary: React.FC<MovementSummaryProps> = ({
  totalCount,
  globalNetCents,
  n26NetCents,
  unicajaNetCents,
  sabadellNetCents,
}) => {
  const isGlobalPositive = globalNetCents >= 0;

  return (
    <div id="movement-summary-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* Global Net Balance */}
      <div 
        id="card-global" 
        className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 flex flex-col justify-between"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Saldo Neto Global</p>
            <h3 className="text-3xl font-sans font-bold tracking-tight mt-1">
              {formatCentsToEuro(globalNetCents)}
            </h3>
          </div>
          <div className={`p-2.5 rounded-xl ${isGlobalPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {isGlobalPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
        </div>
        <div className="flex items-center text-xs text-slate-400 mt-2">
          <Wallet size={14} className="mr-1.5" />
          <span>{totalCount} movimientos almacenados</span>
        </div>
      </div>

      {/* N26 Summary */}
      <div 
        id="card-n26" 
        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700">N26</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Suma neta</p>
          <h4 className={`text-xl font-sans font-semibold mt-1 ${n26NetCents >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCentsToEuro(n26NetCents)}
          </h4>
        </div>
      </div>

      {/* Unicaja Summary */}
      <div 
        id="card-unicaja" 
        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-green-50 text-green-700">Unicaja</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Suma neta</p>
          <h4 className={`text-xl font-sans font-semibold mt-1 ${unicajaNetCents >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCentsToEuro(unicajaNetCents)}
          </h4>
        </div>
      </div>

      {/* Sabadell Summary */}
      <div 
        id="card-sabadell" 
        className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-slate-300"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">Sabadell</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">Suma neta</p>
          <h4 className={`text-xl font-sans font-semibold mt-1 ${sabadellNetCents >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatCentsToEuro(sabadellNetCents)}
          </h4>
        </div>
      </div>
    </div>
  );
};
