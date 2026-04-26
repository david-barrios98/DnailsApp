/** Base del backend (sin /api/v1; el cliente lo añade). */
export const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:3333";

export const API_V1 = `${API_ORIGIN}/api/v1`;
