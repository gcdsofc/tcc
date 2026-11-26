import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAsync } from './hooks';
import { ApiError } from '../services/http';

describe('useAsync', () => {
  it('define aviso de sucesso e retorna true quando a ação conclui', async () => {
    const { result } = renderHook(() => useAsync());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.run(async () => {}, 'Pronto.');
    });
    expect(outcome).toBe(true);
    expect(result.current.notice).toBe('Pronto.');
    expect(result.current.error).toBe('');
    expect(result.current.busy).toBe(false);
  });

  it('captura o erro, expõe a mensagem e retorna false', async () => {
    const { result } = renderHook(() => useAsync());
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.run(async () => {
        throw new ApiError('Telefone já cadastrado.', 409);
      });
    });
    expect(outcome).toBe(false);
    expect(result.current.error).toBe('Telefone já cadastrado.');
    expect(result.current.busy).toBe(false);
  });

  it('limpa erro e aviso com reset', async () => {
    const { result } = renderHook(() => useAsync());
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('x');
      });
    });
    act(() => result.current.reset());
    expect(result.current.error).toBe('');
    expect(result.current.notice).toBe('');
  });
});
