import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './http';

type FakeResponse = { ok: boolean; status?: number; json: () => Promise<unknown> };

function stubFetch(impl: () => Promise<FakeResponse>) {
  vi.stubGlobal('fetch', vi.fn(impl) as unknown as typeof fetch);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('request', () => {
  it('devolve os dados em caso de sucesso', async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ id: 'abc' }) }));
    const data = await request<{ id: string }>('/api/x');
    expect(data.id).toBe('abc');
  });

  it('envia o token no cabeçalho Authorization', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<FakeResponse> => ({
        ok: true,
        json: async () => ({}),
      }),
    );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await request('/api/x', { token: 'tok123', method: 'POST', body: { a: 1 } });

    const init = fetchMock.mock.calls[0][1];
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok123');
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('transforma resposta de erro em ApiError com a mensagem do backend', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Nome é obrigatório.', error: 'BAD_REQUEST' }),
    }));
    await expect(request('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Nome é obrigatório.',
      code: 'BAD_REQUEST',
    });
  });

  it('usa mensagem genérica quando o corpo de erro não é JSON', async () => {
    stubFetch(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json');
      },
    }));
    const error = await request('/api/x').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toContain('500');
  });

  it('traduz falha de rede em ApiError status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new TypeError('network down');
      }) as unknown as typeof fetch,
    );
    const error = await request('/api/x').catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toMatch(/Nada foi salvo/);
  });
});
