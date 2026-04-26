/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** si es "true", inicia con sesión demo (sin API) y puedes ver todas las vistas */
  readonly VITE_DEV_BYPASS_AUTH?: string;
}
