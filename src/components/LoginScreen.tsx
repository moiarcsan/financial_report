import React, { useState } from "react";
import { login, getAvailableProfiles, type UserProfile } from "../services/authService";
import { Eye, EyeOff, Wallet } from "lucide-react";

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

    try {
      const profile = await login(selectedUserId, password);
      if (profile) {
        setIsLoading(false);
        onLoginSuccess(profile);
      } else {
        setError("Contraseña incorrecta. Inténtalo de nuevo.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Error durante el login. Inténtalo de nuevo.");
      setIsLoading(false);
    }
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
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xl p-8">
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
                  className="w-full px-3 py-3 text-sm font-sans border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-0 focus:border-indigo-500 bg-slate-50/50 hover:border-slate-300 transition-all appearance-none"
                  required
                >
                  <option value="">Selecciona un usuario</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.avatar} {profile.name}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 pr-12 py-3 text-sm font-sans border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-0 focus:border-indigo-500 bg-slate-50/50 hover:border-slate-300 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors px-2"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              className="w-full py-3 text-base font-sans font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Tus datos se sincronizan con Supabase en la nube.
              <br />
              La sesión se cierra automáticamente por inactividad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};