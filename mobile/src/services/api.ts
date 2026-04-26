import { API_V1 } from "@/config";
import {
  DEMO_UI_TOKEN,
  getDemoAppointmentsList,
  getDemoAppointment,
  getDemoUser,
  patchDemoAppointment,
} from "@/services/demoMode";
import type { Appointment, AuthUser, LoginResponse } from "@/types/api";

const TOKEN_KEY = "dnails_token";

export { DEMO_UI_TOKEN };

export function isDemoUiSession(): boolean {
  return getToken() === DEMO_UI_TOKEN;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null): void {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function handleDemoApi<T>(path: string, init: RequestInit): T {
  const method = (init.method ?? "GET").toUpperCase();
  const u = new URL(path, "http://_");
  const p = u.pathname;

  if (p === "/auth/me" && method === "GET") {
    return { user: getDemoUser() } as T;
  }
  if (p === "/appointments" && method === "GET") {
    const st = u.searchParams.get("status") ?? undefined;
    return getDemoAppointmentsList(st) as T;
  }
  const m = /^\/appointments\/(\d+)$/.exec(p);
  if (m) {
    const id = Number(m[1]);
    if (method === "GET") {
      const r = getDemoAppointment(id);
      if (!r) throw new Error("Cita no encontrada");
      return r as T;
    }
    if (method === "PATCH") {
      const raw = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const r = patchDemoAppointment(id, {
        status: raw.status as string | undefined,
        startAt: raw.startAt as string | null | undefined,
        endAt: raw.endAt as string | null | undefined,
        notes: raw.notes as string | null | undefined,
      });
      if (!r) throw new Error("Cita no encontrada");
      return r as T;
    }
  }
  throw new Error("Modo demostración: no implementado para esta acción");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (isDemoUiSession()) {
    return handleDemoApi<T>(path, init);
  }
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_V1}${path}`, { ...init, headers });
  if (res.status === 401) {
    if (getToken() !== DEMO_UI_TOKEN) setToken(null);
    const err: Error & { code?: string } = new Error("Sesión expirada o no autorizado.");
    err.code = "UNAUTHORIZED";
    throw err;
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const e = (data as { error?: string })?.error || res.statusText;
    throw new Error(typeof e === "string" ? e : "Error de API");
  }
  return data as T;
}

const LOGIN_ERR: Record<string, string> = {
  invalid_credentials: "Teléfono o contraseña incorrectos.",
  invalid_phone: "Revisa el número (ej. 3001234567 o +573001234567).",
};

export async function loginRequest(phone: string, password: string): Promise<LoginResponse> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_V1}/auth/login`, { method: "POST", body: JSON.stringify({ phone, password }), headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as { error?: string }) : null;
  if (!res.ok) {
    const code = data?.error;
    throw new Error((code && LOGIN_ERR[code]) || (typeof code === "string" ? code : "No se pudo iniciar sesión"));
  }
  return data as unknown as LoginResponse;
}

export async function meRequest(): Promise<{ user: AuthUser | null }> {
  return api<{ user: AuthUser | null }>("/auth/me");
}

export async function listAppointments(params: { status?: string } = {}): Promise<{ appointments: Appointment[] }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  const tail = q.toString() ? `?${q.toString()}` : "";
  return api<{ appointments: Appointment[] }>(`/appointments${tail}`);
}

export async function getAppointment(id: number): Promise<{ appointment: Appointment }> {
  return api<{ appointment: Appointment }>(`/appointments/${id}`);
}

export async function updateAppointment(
  id: number,
  body: Partial<{
    status: string;
    startAt: string | null;
    endAt: string | null;
    notes: string | null;
  }>,
): Promise<{ appointment: Appointment }> {
  return api<{ appointment: Appointment }>(`/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
