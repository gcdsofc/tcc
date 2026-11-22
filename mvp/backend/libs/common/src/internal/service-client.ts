import { serviceSecret } from './service-secret.guard';

export interface ServiceResponse<T> { ok: boolean; status: number; data: T | null }

/** Chamada HTTP entre serviços, com segredo interno e timeout. Retorna status 0 se o serviço não responder. */
export async function callService<T = unknown>(
  baseUrl: string | undefined,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<ServiceResponse<T>> {
  if (!baseUrl) return { ok: false, status: 0, data: null };
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'x-service-secret': serviceSecret(),
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init.timeoutMs ?? 5000),
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
