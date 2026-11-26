import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../services/http';
import { customersService } from '../services/customers';
import { workordersService } from '../services/workorders';
import type { Customer, OrderSummary, Vehicle } from '../types/api';
import { capabilities } from './permissions';
import { useSession } from './session';

interface TenantData {
  orders: OrderSummary[];
  customers: Customer[];
  vehicles: Vehicle[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const TenantDataContext = createContext<TenantData | null>(null);

export function TenantDataProvider({ children }: { children: ReactNode }) {
  const { tenantToken, tenantRoles, handleSessionError } = useSession();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canReadPeople = capabilities(tenantRoles).canReadPeople;

  const load = useCallback(async () => {
    if (!tenantToken) return;
    setLoading(true);
    setError('');
    try {
      const [orderData, customerData, vehicleData] = await Promise.all([
        workordersService.listOrders(tenantToken),
        canReadPeople ? customersService.listCustomers(tenantToken) : Promise.resolve([]),
        canReadPeople ? customersService.listVehicles(tenantToken) : Promise.resolve([]),
      ]);
      setOrders(orderData);
      setCustomers(customerData);
      setVehicles(vehicleData);
    } catch (err) {
      if (!handleSessionError(err)) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os dados da oficina.');
      }
    } finally {
      setLoading(false);
    }
  }, [tenantToken, canReadPeople, handleSessionError]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<TenantData>(
    () => ({ orders, customers, vehicles, loading, error, reload: load }),
    [orders, customers, vehicles, loading, error, load],
  );

  return <TenantDataContext.Provider value={value}>{children}</TenantDataContext.Provider>;
}

export function useTenantData(): TenantData {
  const ctx = useContext(TenantDataContext);
  if (!ctx) throw new Error('useTenantData deve ser usado dentro de TenantDataProvider.');
  return ctx;
}
