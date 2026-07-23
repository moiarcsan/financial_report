import React, { useState } from "react";
import { login, getAvailableProfiles, type UserProfile } from "../services/authService";
import { Lock, User, Eye, EyeOff, Wallet } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const profiles = getAvailableProfiles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!selectedUserId) {
      setError("Selecciona un usuario.");
      setIsLoading(false);
      return;
    }

    const profile = await login(selectedUserId, password);
    if (profile) {
      onLoginSuccess(profile);
    } else {
      setError("Contraseña incorrecta. Inténtalo de nuevo.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-sans font-bold text-slate-900 tracking-tight">
            Control financiero del hogar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acceso seguro a tus datos financieros
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Usuario
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setError("");
                  }}
                  className="w-full pl-10 pr-3 py-2.5 text-sm font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white appearance-none"
                  required
                >
                  <option value="">Selecciona un usuario</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.avatar} {profile.name}
                    </option>
                  ))}
                </select>
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Introduce tu contraseña"
                  className="w-full pl-10 pr-12 py-2.5 text-sm font-sans border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  autoComplete="current-password"
                  required
                />
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-xs text-rose-600 font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-sm font-sans font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Los datos se almacenan localmente en tu navegador.
              <br />
              La sesión se cierra automáticamente por inactividad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};