/**
 * Servicio de autenticación seguro.
 *
 * - Los usuarios y contraseñas se leen desde variables de entorno de Vite.
 * - Las contraseñas se almacenan como hashes SHA-256 (más seguro que texto plano).
 * - La sesión se guarda en sessionStorage (se borra al cerrar la pestaña).
 * - La contraseña nunca se persiste: solo se valida en memoria.
 */

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

/**
 * Genera un hash SHA-256 de una cadena.
 * Usa la Web Crypto API nativa del navegador.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compara una contraseña en texto plano con un hash SHA-256.
 */
async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

/**
 * Carga los usuarios desde las variables de entorno de Vite.
 * Formato esperado: VITE_USER_1_ID, VITE_USER_1_NAME, VITE_USER_1_AVATAR, VITE_USER_1_PASSWORD_HASH, etc.
 */
function loadUsersFromEnv(): Record<
  string,
  { passwordHash: string; profile: UserProfile }
> {
  const users: Record<string, { passwordHash: string; profile: UserProfile }> = {};

  // Buscar usuarios en las variables de entorno (hasta 10 usuarios soportados)
  for (let i = 1; i <= 10; i++) {
    const id = import.meta.env[`VITE_USER_${i}_ID`] as string | undefined;
    const name = import.meta.env[`VITE_USER_${i}_NAME`] as string | undefined;
    const avatar = import.meta.env[`VITE_USER_${i}_AVATAR`] as string | undefined;
    const passwordHash = import.meta.env[
      `VITE_USER_${i}_PASSWORD_HASH`
    ] as string | undefined;

    if (id && name && avatar && passwordHash) {
      users[id] = {
        passwordHash,
        profile: { id, name, avatar },
      };
    }
  }

  return users;
}

// Perfiles configurados desde variables de entorno
const USERS = loadUsersFromEnv();

const SESSION_KEY = "auth_session";

/**
 * Valida las credenciales y crea una sesión.
 * Devuelve el perfil si es correcto, null si falla.
 */
export async function login(
  userId: string,
  password: string
): Promise<UserProfile | null> {
  const user = USERS[userId];
  if (!user) return null;

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return null;

  // Guardamos solo el ID del usuario en sessionStorage
  // La contraseña NUNCA se persiste
  sessionStorage.setItem(SESSION_KEY, userId);
  return user.profile;
}

/**
 * Cierra la sesión limpiando sessionStorage.
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Comprueba si hay una sesión activa.
 * Devuelve el perfil si la sesión es válida, null en caso contrario.
 */
export function getCurrentSession(): UserProfile | null {
  const userId = sessionStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const user = USERS[userId];
  if (!user) {
    // El usuario almacenado no existe → limpiamos
    logout();
    return null;
  }
  return user.profile;
}

/**
 * Devuelve la lista de perfiles disponibles para el selector de login.
 */
export function getAvailableProfiles(): UserProfile[] {
  return Object.values(USERS).map((u) => u.profile);
}

/**
 * Función de utilidad para generar hashes de contraseñas.
 * Úsala en la consola del navegador para generar el hash de una contraseña.
 * Ejemplo: generatePasswordHash('mi_password')
 */
export async function generatePasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}