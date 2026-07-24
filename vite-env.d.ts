/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Authentication
  readonly VITE_USER_1_ID: string | undefined;
  readonly VITE_USER_1_NAME: string | undefined;
  readonly VITE_USER_1_AVATAR: string | undefined;
  readonly VITE_USER_1_PASSWORD_HASH: string | undefined;
  readonly VITE_USER_2_ID: string | undefined;
  readonly VITE_USER_2_NAME: string | undefined;
  readonly VITE_USER_2_AVATAR: string | undefined;
  readonly VITE_USER_2_PASSWORD_HASH: string | undefined;
  // ... pueden añadirse más usuarios según sea necesario

  // Supabase
  readonly VITE_SUPABASE_URL: string | undefined;
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;

  [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}