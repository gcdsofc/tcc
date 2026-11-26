import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useTenantData } from '../../app/tenant-data';
import { useAsync } from '../../app/hooks';
import { capabilities } from '../../app/permissions';
import { formatDate, orderVehicleModel } from '../../app/format';
import { workordersService } from '../../services/workorders';
import { EmptyState, Feedback, OrderStatusPill, PageHeading, SectionTitle, Stat } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { OrderSummary } from '../../types/api';

interface HomePageProps {
  onOpenOrder: (id: string) => void;
  onGoToClients: () => void;
}

function OrderList({ orders, onOpen }: { orders: OrderSummary[]; onOpen: (id: string) => void }) {
  if (!orders.length) {
    return <EmptyState title="Nenhuma ordem encontrada" detail="As ordens desta oficina aparecerão aqui." />;
  }
  return (
    <div className="order-table">
      {orders.map((order, index) => (
        <button
          type="button"
          className="order-row"
          key={order.id}
          onClick={() => onOpen(order.id)}
          style={{ '--i': Math.min(index, 8) } as CSSProperties}
        >
          <span className="order-id">OS-{order.id.slice(0, 6).toUpperCase()}</span>
          <span className="order-description">
            <b>{order.problem}</b>
            <small>
              {[order.customer_name, [order.vehicle_plate, orderVehicleModel(order)].filter(Boolean).join(' '), formatDate(order.opened_at)]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </span>
          <OrderStatusPill status={order.status} />
          <span className="row-chevron" aria-hidden="true">
            <Icon name="chevron-right" size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

function OpenOrderForm({ onGoToClients }: { onGoToClients: () => void }) {
  const { tenantToken } = useSession();
  const { customers, vehicles, reload } = useTenantData();
  const { busy, error, notice, run, setNotice } = useAsync();
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [problem, setProblem] = useState('');

  const availableVehicles = vehicles.filter((vehicle) => !customerId || vehicle.customer_id === customerId);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      await workordersService.createOrder(tenantToken, { customerId, vehicleId, problem: problem.trim() });
      setCustomerId('');
      setVehicleId('');
      setProblem('');
      await reload();
      setNotice('Ordem de serviço criada.');
    });
  };

  return (
    <section className="content-card order-create">
      <SectionTitle icon="plus" title="Abrir ordem de serviço" description="Registre a solicitação inicial do cliente." />
      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />
      {!customers.length || !vehicles.length ? (
        <div className="inline-empty">
          Cadastre primeiro um cliente e o veículo dele na aba{' '}
          <button type="button" className="inline-link" onClick={onGoToClients}>
            Clientes
          </button>{' '}
          para abrir uma ordem.
        </div>
      ) : (
        <form className="order-form" onSubmit={submit}>
          <label>
            Cliente
            <select
              required
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setVehicleId('');
              }}
            >
              <option value="" disabled>
                Selecione um cliente
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Veículo
            <select required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
              <option value="" disabled>
                Selecione o veículo
              </option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} · {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          <label className="problem-field">
            Relato do cliente
            <input
              required
              placeholder="Ex.: ruído ao frear, revisão preventiva..."
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            Criar ordem
          </button>
        </form>
      )}
    </section>
  );
}

export function HomePage({ onOpenOrder, onGoToClients }: HomePageProps) {
  const { tenantRoles } = useSession();
  const { orders, customers, vehicles } = useTenantData();
  const can = capabilities(tenantRoles);
  const [filter, setFilter] = useState('');

  const openCount = orders.filter((order) => !['closed', 'closed_refused'].includes(order.status)).length;
  const pendingCount = orders.filter((order) => order.status === 'awaiting_approval').length;
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const inProgressCount = orders.filter((order) => order.status === 'in_progress').length;
  const closedCount = orders.filter((order) => order.status === 'closed').length;

  const visibleOrders = useMemo(
    () => orders.filter((order) => !filter || order.status === filter),
    [orders, filter],
  );

  const heading = can.isCustomer
    ? { title: 'Seus atendimentos', description: 'Acompanhe o andamento dos serviços dos seus veículos.' }
    : can.isMechanic && !can.isStaff
      ? { title: 'Fila de serviços', description: 'Consulte ordens, registre diagnósticos e converse com os clientes.' }
      : can.isFinance && !can.isStaff
        ? { title: 'Ordens e pagamentos', description: 'Consulte ordens prontas e registre os pagamentos da oficina.' }
        : { title: 'Visão geral', description: 'Acompanhe a rotina e o andamento dos serviços da oficina.' };

  return (
    <>
      <PageHeading {...heading}>
        {can.isStaff && (
          <button type="button" className="primary" onClick={onGoToClients}>
            <Icon name="plus" size={15} /> Novo cliente
          </button>
        )}
      </PageHeading>

      <section className="stat-grid" aria-label="Indicadores da oficina">
        <Stat
          label={can.isCustomer ? 'Atendimentos' : can.isFinance && !can.isStaff ? 'Prontas para cobrança' : 'Ordens em aberto'}
          value={can.isCustomer ? orders.length : can.isFinance && !can.isStaff ? readyCount : openCount}
          icon="dashboard"
          tone="teal"
        />
        <Stat label="Aguardando aprovação" value={pendingCount} icon="clock" tone="amber" />
        <Stat
          label={can.isFinance && !can.isStaff ? 'Em execução' : 'Prontas para retirada'}
          value={can.isFinance && !can.isStaff ? inProgressCount : readyCount}
          icon="check"
          tone="green"
        />
        <Stat
          label={can.isCustomer ? 'Veículos vinculados' : can.isFinance && !can.isStaff ? 'Concluídas' : 'Clientes cadastrados'}
          value={can.isCustomer ? vehicles.length : can.isFinance && !can.isStaff ? closedCount : customers.length}
          icon={can.isCustomer ? 'vehicle' : can.isFinance && !can.isStaff ? 'check' : 'clients'}
          tone="blue"
        />
      </section>

      {can.canOpenOrders && <OpenOrderForm onGoToClients={onGoToClients} />}

      <section className="content-card">
        <SectionTitle
          icon="dashboard"
          title={can.isCustomer ? 'Histórico de atendimentos' : 'Ordens de serviço'}
          description={`${orders.length} registro(s) nesta oficina`}
        >
          <select
            className="filter-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="open">Abertas</option>
            <option value="awaiting_approval">Aguardando aprovação</option>
            <option value="in_progress">Em execução</option>
            <option value="ready">Prontas</option>
          </select>
        </SectionTitle>
        <OrderList orders={visibleOrders} onOpen={onOpenOrder} />
      </section>
    </>
  );
}
