import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../services/http';
import { identityService } from '../services/identity';
import type { LoginResponse, Office, TenantRole, UserRef } from '../types/api';

// Persistência local da sessão. Chaves com prefixo para não colidir com outras aplicações.
const KEYS = {
  global: 'garageops.globalToken',
  user: 'garageops.user',
  platform: 'garageops.platform',
  tenant: 'garageops.tenantToken',
  office: 'garageops.office',
} as const;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface SessionState {
  ready: boolean;
  globalToken: string;
  user: UserRef | null;
  platform: boolean;
  offices: Office[];
  office: Office | null;
  tenantToken: string;
  tenantRoles: TenantRole[];
  notice: string;
}

export interface SessionApi extends SessionState {
  login: (email: string, password: string) => Promise<void>;
  authenticate: (data: LoginResponse) => Promise<void>;
  refreshOffices: () => Promise<void>;
  selectOffice: (office: Office) => Promise<void>;
  clearOffice: (notice?: string) => void;
  signout: () => void;
  setNotice: (notice: string) => void;
  /** Encerra a sessão se o erro for de autenticação (401). Retorna true se tratou. */
  handleSessionError: (error: unknown) => boolean;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [globalToken, setGlobalToken] = useState(() => localStorage.getItem(KEYS.global) ?? '');
  const [user, setUser] = useState<UserRef | null>(() => readJson<UserRef>(KEYS.user));
  const [platform, setPlatform] = useState(() => localStorage.getItem(KEYS.platform) === '1');
  const [offices, setOffices] = useState<Office[]>([]);
  const [office, setOffice] = useState<Office | null>(() => readJson<Office>(KEYS.office));
  const [tenantToken, setTenantToken] = useState(() => localStorage.getItem(KEYS.tenant) ?? '');
  const [notice, setNoticeState] = useState('');
  const [ready, setReady] = useState(false);

  const officeRef = useRef(office);
  officeRef.current = office;

  const signout = useCallback(() => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    setGlobalToken('');
    setUser(null);
    setPlatform(false);
    setOffices([]);
    setOffice(null);
    setTenantToken('');
    setNoticeState('');
  }, []);

  const clearOffice = useCallback((message?: string) => {
    localStorage.removeItem(KEYS.tenant);
    localStorage.removeItem(KEYS.office);
    setTenantToken('');
    setOffice(null);
    setNoticeState(message ?? '');
  }, []);

  const handleSessionError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.status === 401) {
        signout();
        setNoticeState('Sua sessão expirou. Entre novamente para continuar.');
        return true;
      }
      return false;
    },
    [signout],
  );

  const refreshOffices = useCallback(async () => {
    if (!globalToken || platform) return;
    try {
      setOffices(await identityService.myOffices(globalToken));
    } catch (error) {
      if (!handleSessionError(error)) setOffices([]);
    }
  }, [globalToken, platform, handleSessionError]);

  const authenticate = useCallback(async (data: LoginResponse) => {
    localStorage.setItem(KEYS.global, data.token);
    localStorage.setItem(KEYS.user, JSON.stringify(data.user));
    if (data.platform) localStorage.setItem(KEYS.platform, '1');
    else localStorage.removeItem(KEYS.platform);
    localStorage.removeItem(KEYS.tenant);
    localStorage.removeItem(KEYS.office);
    setGlobalToken(data.token);
    setUser(data.user);
    setPlatform(!!data.platform);
    setOffices(data.offices ?? []);
    setTenantToken('');
    setOffice(null);
    setNoticeState('');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      authenticate(await identityService.login(email, password));
    },
    [authenticate],
  );

  const selectOffice = useCallback(
    async (chosen: Office) => {
      const data = await identityService.selectOffice(globalToken, chosen.id);
      if (!data.token || !data.office?.id) {
        throw new ApiError('Não foi possível ativar esta oficina. Atualize a página e tente novamente.', 0);
      }
      // Garante cor/identidade mesmo que a resposta não traga todos os campos.
      const merged: Office = { ...chosen, ...data.office };
      localStorage.setItem(KEYS.tenant, data.token);
      localStorage.setItem(KEYS.office, JSON.stringify(merged));
      setTenantToken(data.token);
      setOffice(merged);
      setNoticeState(`Oficina ${merged.name} selecionada.`);
    },
    [globalToken],
  );

  const setNotice = useCallback((value: string) => setNoticeState(value), []);

  // Carrega a lista de oficinas quando a conta está logada sem oficina ativa.
  useEffect(() => {
    if (globalToken && !tenantToken && !platform) void refreshOffices();
  }, [globalToken, tenantToken, platform, refreshOffices]);

  // Um token de oficina guardado pode ter expirado ou vir de uma sessão antiga.
  // Valida antes de liberar as telas da oficina, para recuperar com clareza.
  useEffect(() => {
    if (!tenantToken) {
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    (async () => {
      try {
        const session = await identityService.me(tenantToken);
        const current = officeRef.current;
        if (!session.tenantId || (current?.id && session.tenantId !== current.id)) {
          if (active)
            clearOffice('Sua sessão estava sem uma oficina ativa. Escolha uma oficina para continuar.');
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) signout();
        else clearOffice('Sua sessão não está ativa para esta oficina. Selecione uma oficina novamente.');
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [tenantToken, clearOffice, signout]);

  const value = useMemo<SessionApi>(
    () => ({
      ready,
      globalToken,
      user,
      platform,
      offices,
      office,
      tenantToken,
      tenantRoles: office?.roles ?? [],
      notice,
      login,
      authenticate,
      refreshOffices,
      selectOffice,
      clearOffice,
      signout,
      setNotice,
      handleSessionError,
    }),
    [
      ready,
      globalToken,
      user,
      platform,
      offices,
      office,
      tenantToken,
      notice,
      login,
      authenticate,
      refreshOffices,
      selectOffice,
      clearOffice,
      signout,
      setNotice,
      handleSessionError,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return ctx;
}
