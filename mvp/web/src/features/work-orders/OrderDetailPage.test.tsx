import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { OrderDetail } from '../../types/api';

// O mecânico abre a ordem: cliente e veículo precisam aparecer no topo do detalhe.
vi.mock('../../app/session', () => ({
  useSession: () => ({ tenantToken: 'token', tenantRoles: ['mechanic'] }),
}));
vi.mock('../../app/tenant-data', () => ({
  useTenantData: () => ({ orders: [], customers: [], vehicles: [], loading: false, error: '', reload: vi.fn() }),
}));

const order: OrderDetail = {
  id: '10000000-0000-4000-8000-000000000001',
  status: 'in_progress',
  problem: 'Problema no sistema de freios',
  opened_at: '2026-11-20T12:00:00Z',
  customer_id: 'c1',
  vehicle_id: 'v1',
  customer_name: 'Ana Cliente',
  vehicle_plate: 'ABC1A01',
  vehicle_make: 'Honda',
  vehicle_model: 'Civic',
  vehicle_year: 2019,
  diagnosis: null,
  estimates: [],
  messages: [],
  executions: [{ description: 'Revisão do sistema de freios', performed_at: '2026-11-21T10:00:00Z' }],
  payments: [],
};

vi.mock('../../services/workorders', () => ({
  workordersService: { getOrder: vi.fn(async () => order) },
}));

const { OrderDetailPage } = await import('./OrderDetailPage');

describe('OrderDetailPage', () => {
  it('mostra cliente, veículo e serviços executados para o mecânico', async () => {
    render(<OrderDetailPage orderId={order.id} onBack={() => {}} />);
    const parties = (await screen.findByText('Cliente')).closest('dl') as HTMLElement;
    expect(within(parties).getByText('Ana Cliente')).toBeInTheDocument();
    expect(within(parties).getByText('ABC1A01')).toBeInTheDocument();
    expect(within(parties).getByText(/Honda Civic 2019/)).toBeInTheDocument();
    expect(screen.getByText('Serviços executados')).toBeInTheDocument();
    expect(screen.getByText('Revisão do sistema de freios')).toBeInTheDocument();
  });

  it('não quebra quando o serviço de clientes não devolveu os nomes', async () => {
    order.customer_name = null;
    order.vehicle_plate = null;
    order.vehicle_make = null;
    order.vehicle_model = null;
    order.vehicle_year = null;
    render(<OrderDetailPage orderId={order.id} onBack={() => {}} />);
    const parties = (await screen.findByText('Cliente')).closest('dl') as HTMLElement;
    expect(within(parties).getAllByText('Não informado')).toHaveLength(2);
  });
});
