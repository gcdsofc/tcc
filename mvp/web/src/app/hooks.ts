import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { ApiError } from '../services/http';

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Algo deu errado. Tente novamente.';
}

/** Controla uma ação do usuário (envio de formulário, comando): ocupado, erro e aviso. */
export function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = useCallback(
    async (fn: () => Promise<void>, successNotice?: string): Promise<boolean> => {
      setError('');
      setNotice('');
      setBusy(true);
      try {
        await fn();
        if (successNotice) setNotice(successNotice);
        return true;
      } catch (err) {
        setError(messageOf(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError('');
    setNotice('');
  }, []);

  return { busy, error, notice, run, setError, setNotice, reset };
}

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
}

/** Carrega um dado da API, com estados de carregando/erro e recarregamento sob demanda. */
export function useResource<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    loader(controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active && err?.name !== 'AbortError') setError(messageOf(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, reload };
}
