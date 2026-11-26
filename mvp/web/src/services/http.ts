// Cliente HTTP único do frontend. Centraliza cabeçalhos, envio do token e o
// tratamento de erro, para que as telas lidem sempre com o mesmo tipo de falha.

/** Erro de uma chamada à API. `status` 0 significa que o servidor não respondeu. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
}

const OFFLINE_MESSAGE =
  'Não foi possível falar com o servidor. Nada foi salvo; aguarde alguns segundos e tente novamente.';

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token, body, signal } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      cache: 'no-store',
      signal,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Sem resposta do servidor (fora do ar, reiniciando ou sem rede).
    throw new ApiError(OFFLINE_MESSAGE, 0);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      `Falha na solicitação (${response.status}).`;
    const code = typeof data.error === 'string' ? data.error : undefined;
    throw new ApiError(message, response.status, code);
  }

  return data as T;
}

export const http = {
  get: <T>(path: string, token?: string, signal?: AbortSignal) =>
    request<T>(path, { token, signal }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),
  del: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'DELETE', body, token }),
};
