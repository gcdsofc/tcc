import { useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useTenantData } from '../../app/tenant-data';
import { useAsync } from '../../app/hooks';
import { capabilities } from '../../app/permissions';
import { customersService } from '../../services/customers';
import { EmptyState, Feedback, OrderStatusPill, PageHeading, SectionTitle } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { VehicleReference, emptyVehicleRef, type VehicleRef } from './VehicleReference';

interface VehiclesPageProps {
  onOpenOrder: (id: string) => void;
  onGoToClients: () => void;
}

function VehicleForm({ onGoToClients }: { onGoToClients: () => void }) {
  const { tenantToken } = useSession();
  const { customers, reload } = useTenantData();
  const { busy, error, notice, run, setError, setNotice } = useAsync();
  const [customerId, setCustomerId] = useState('');
  const [plate, setPlate] = useState('');
  const [ref, setRef] = useState<VehicleRef>(emptyVehicleRef);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ref.mode === 'fipe' && ref.brand && !ref.fipeCode) {
      setError('Escolha marca, modelo e ano nas listas da FIPE ou use o preenchimento manual.');
      return;
    }
    void run(async () => {
      await customersService.createVehicle(tenantToken, {
        customerId,
        plate: plate.trim(),
        make: ref.brand.trim() || null,
        model: ref.model.trim() || null,
        year: Number(ref.year) || null,
        fipeCode: ref.fipeCode || null,
      });
      setCustomerId('');
      setPlate('');
      setRef({ ...emptyVehicleRef, mode: ref.mode });
      await reload();
      setNotice('Veículo cadastrado.');
    });
  };

  return (
    <section className="content-card">
      <SectionTitle icon="vehicle" title="Novo veículo" description="Vincule o veículo a um cliente já cadastrado." />
      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />
      {!customers.length ? (
        <div className="inline-empty">
          Cadastre um cliente antes de incluir um veículo.{' '}
          <button type="button" className="inline-link" onClick={onGoToClients}>
            Ir para Clientes
          </button>
        </div>
      ) : (
        <form className="form-grid vehicle-form" onSubmit={submit}>
          <label>
            Cliente
            <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
              <option value="" disabled>
                Selecione
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Placa
            <input
              required
              placeholder="ABC1D23"
              maxLength={8}
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
            />
          </label>
          <VehicleReference token={tenantToken} value={ref} onChange={setRef} />
          <div className="form-actions">
            <button className="primary" disabled={busy}>
              {busy ? 'Cadastrando…' : 'Cadastrar veículo'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function VehiclesPage({ onOpenOrder, onGoToClients }: VehiclesPageProps) {
  const { tenantRoles } = useSession();
  const { vehicles, orders, loading } = useTenantData();
  const can = capabilities(tenantRoles);

  return (
    <>
      <PageHeading
        title={can.isCustomer ? 'Meus veículos' : 'Veículos'}
        description={
          can.isCustomer
            ? 'Veículos e serviços associados à oficina selecionada.'
            : 'Veículos cadastrados para os clientes desta oficina.'
        }
      >
        {!can.isCustomer && <span className="count-chip">{vehicles.length} veículo(s)</span>}
      </PageHeading>

      {can.canRegister && <VehicleForm onGoToClients={onGoToClients} />}

      <section className="vehicle-grid">
        {vehicles.map((vehicle) => {
          const history = orders.filter((order) => order.vehicle_id === vehicle.id);
          return (
            <article className="vehicle-card" key={vehicle.id}>
              <div className="vehicle-top">
                <span className="vehicle-symbol">
                  <Icon name="vehicle" size={18} />
                </span>
                <span className="plate-chip">{vehicle.plate}</span>
              </div>
              <h2>
                {vehicle.make || 'Marca não informada'} {vehicle.model || ''}
              </h2>
              <p>
                {vehicle.year || 'Ano não informado'}
                {vehicle.customer_name ? ` · ${vehicle.customer_name}` : ''}
              </p>
              <div className="vehicle-history">
                {history.map((order) => (
                  <button
                    type="button"
                    className="history-link"
                    key={order.id}
                    onClick={() => onOpenOrder(order.id)}
                  >
                    <span>{order.problem}</span>
                    <OrderStatusPill status={order.status} />
                  </button>
                ))}
                {!history.length && <small>Nenhuma ordem registrada para este veículo.</small>}
              </div>
            </article>
          );
        })}
        {!loading && !vehicles.length && (
          <EmptyState
            title="Nenhum veículo cadastrado"
            detail="Os veículos aparecerão aqui após serem vinculados a um cliente."
          />
        )}
      </section>
    </>
  );
}
