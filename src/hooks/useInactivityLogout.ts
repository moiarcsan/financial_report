import { useEffect, useRef, useCallback } from "react";
import { logout } from "../services/authService";

/**
 * Hook que cierra la sesión automáticamente tras un período de inactividad.
 *
 * Detecta movimientos del ratón, pulsaciones de teclado, scrolls y toques.
 * Si no hay actividad durante `timeoutMs` milisegundos, llama a `onLogout()`.
 *
 * @param timeoutMs   Tiempo de inactividad antes de cerrar sesión (default: 15 minutos).
 * @param onLogout    Callback que se ejecuta al cerrar sesión por inactividad.
 */
export function useInactivityLogout(
  timeoutMs: number = 15 * 60 * 1000,
  onLogout?: () => void
): void {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      logout();
      onLogout?.();
    }, timeoutMs);
  }, [timeoutMs, onLogout]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
    ];

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}
