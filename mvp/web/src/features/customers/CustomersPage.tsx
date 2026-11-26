import { useMemo, useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useTenantData } from '../../app/tenant-data';
import { useAsync } from '../../app/hooks';
import { capabilities } from '../../app/permissions';
import { formatPhone, initials } from '../../app/format';
import { customersService } from '../../services/customers';
import { EmptyState, Feedback, PageHeading, SectionTitle } from '../../components/ui';
import type { Customer, CustomerInput } from '../../types/api';

interface AddressState {
  cep: string;
  street: string;
  addressNumber: string;
  district: string;
  city: string;
  state: string;
}

const emptyAddress: AddressState = {
  cep: '',
  street: '',
  addressNumber: '',
  district: '',
  city: '',
  state: '',
};

interface CepStatus {
  tone: '' | 'loading' | 'ok' | 'error';
  text: string;
}

function CustomerForm() {
  const { tenantToken } = useSession();
  const { reload } = useTenantData();
  const { busy, error, notice, run, setNotice } = useAsync();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<AddressState>(emptyAddress);
  const [cep, setCep] = useState<CepStatus>({ tone: '', text: '' });

  const addressField = (key: keyof AddressState) => ({
    value: address[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setAddress((current) => ({ ...current, [key]: event.target.value })),
  });

  // Integração externa (ViaCEP) pelo serviço de clientes; se falhar, digita-se à mão.
  const lookupCep = async () => {
    const digits = address.cep.replace(/\D/g, '');
    if (!digits) return;
    if (digits.length !== 8) {
      setCep({ tone: 'error', text: 'O CEP precisa ter 8 dígitos.' });
      return;
    }
    setCep({ tone: 'loading', text: 'Consultando o ViaCEP…' });
    try {
      const found = await customersService.lookupAddress(tenantToken, digits);
      setAddress((current) => ({
        ...current,
        street: found.street || '',
        district: found.district || '',
        city: found.city || '',
        state: found.state || '',
      }));
      setCep({ tone: 'ok', text: 'Endereço preenchido pelo ViaCEP. Confira e informe o número.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível consultar o CEP.';
      setCep({ tone: 'error', text: `${message} Você pode preencher o endereço manualmente.` });
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: CustomerInput = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      cep: address.cep || undefined,
      street: address.street || undefined,
      addressNumber: address.addressNumber || undefined,
      district: address.district || undefined,
      city: address.city || undefined,
      state: address.state || undefined,
    };
    void run(async () => {
      await customersService.createCustomer(tenantToken, input);
      setName('');
      setPhone('');
      setEmail('');
      setAddress(emptyAddress);
      setCep({ tone: '', text: '' });
      await reload();
      setNotice('Cliente cadastrado nesta oficina.');
    });
  };

  return (
    <section className="content-card">
      <SectionTitle
        icon="clients"
        title="Novo cliente"
        description="O cadastro fica vinculado somente à oficina ativa."
      />
      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />
      <form className="form-grid three-fields" onSubmit={submit}>
        <label>
          Nome completo
          <input
            required
            placeholder="Nome do cliente"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Telefone
          <input
            type="tel"
            required
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label>
          E-mail <span className="optional">Opcional</span>
          <input
            type="email"
            placeholder="cliente@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <fieldset className="address-fields">
          <legend>
            Endereço <span className="optional">Opcional · busca automática pelo CEP (ViaCEP)</span>
          </legend>
          <label>
            CEP
            <span className="cep-input">
              <input
                inputMode="numeric"
                maxLength={9}
                placeholder="00000-000"
                {...addressField('cep')}
                onBlur={lookupCep}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void lookupCep();
                  }
                }}
              />
              <button
                type="button"
                className="secondary"
                onClick={lookupCep}
                disabled={cep.tone === 'loading'}
              >
                Buscar
              </button>
            </span>
          </label>
          <label className="street-field">
            Rua
            <input maxLength={160} {...addressField('street')} />
          </label>
          <label>
            Número
            <input maxLength={20} {...addressField('addressNumber')} />
          </label>
          <label>
            Bairro
            <input maxLength={80} {...addressField('district')} />
          </label>
          <label>
            Cidade
            <input maxLength={80} {...addressField('city')} />
          </label>
          <label>
            UF
            <input maxLength={2} {...addressField('state')} />
          </label>
          {cep.text && (
            <p className={`cep-status ${cep.tone}`} role="status">
              {cep.text}
            </p>
          )}
        </fieldset>
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            {busy ? 'Cadastrando…' : 'Cadastrar cliente'}
          </button>
        </div>
      </form>
    </section>
  );
}

function CustomerRow({ customer, vehicleCount }: { customer: Customer; vehicleCount: number }) {
  const addressLine = [
    customer.street && `${customer.street}${customer.address_number ? `, ${customer.address_number}` : ''}`,
    customer.district,
    customer.city && `${customer.city}/${customer.state || ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="customer-row">
      <span className="customer-avatar">{initials(customer.name)}</span>
      <div className="customer-main">
        <b>{customer.name}</b>
        <small>
          {formatPhone(customer.phone)}
          {customer.email ? ` · ${customer.email}` : ''}
        </small>
        {addressLine && <small className="customer-address">{addressLine}</small>}
      </div>
      <span className="vehicle-count">{vehicleCount} veículo(s)</span>
    </article>
  );
}

export function CustomersPage() {
  const { tenantRoles } = useSession();
  const { customers, vehicles, loading } = useTenantData();
  const can = capabilities(tenantRoles);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.phone} ${formatPhone(customer.phone)} ${customer.email || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  return (
    <>
      <PageHeading title="Clientes" description="Cadastre pessoas e veículos atendidos por esta oficina.">
        <span className="count-chip">{customers.length} cliente(s)</span>
      </PageHeading>

      {can.canRegister && <CustomerForm />}

      <section className="content-card">
        <SectionTitle icon="clients" title="Clientes cadastrados" description="Os dados e veículos ficam isolados por oficina.">
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
          />
        </SectionTitle>
        <div className="customer-list">
          {filtered.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              vehicleCount={vehicles.filter((vehicle) => vehicle.customer_id === customer.id).length}
            />
          ))}
          {!loading && !filtered.length && (
            <EmptyState
              title={customers.length ? 'Nenhum cliente encontrado' : 'Ainda não há clientes'}
              detail={
                customers.length
                  ? 'Tente buscar por outro nome, telefone ou e-mail.'
                  : 'Use o formulário acima para cadastrar o primeiro cliente.'
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
