import { useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useTenantData } from '../../app/tenant-data';
import { useAsync } from '../../app/hooks';
import { formatDateTime } from '../../app/format';
import { identityService } from '../../services/identity';
import { Feedback, PageHeading } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { InviteCreated } from '../../types/api';

interface InvitesPageProps {
  onGoToClients: () => void;
}

export function InvitesPage({ onGoToClients }: InvitesPageProps) {
  const { tenantToken } = useSession();
  const { customers } = useTenantData();
  const { busy, error, notice, run, setError, setNotice } = useAsync();
  const [customerId, setCustomerId] = useState('');
  const [invite, setInvite] = useState<InviteCreated | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) {
      setError('Selecione um cliente cadastrado nesta oficina.');
      return;
    }
    void run(async () => {
      const created = await identityService.createInvite(tenantToken, customer.name, customer.phone);
      setInvite(created);
      setNotice('Convite gerado. Compartilhe o link e o código somente com o cliente.');
    });
  };

  return (
    <>
      <PageHeading
        title="Convidar cliente"
        description="O convite associa o cliente à oficina sem expor dados pelo link."
      />
      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />

      <section className="content-card invite-card">
        <div className="invite-explainer">
          <span className="section-icon">
            <Icon name="invite" size={16} />
          </span>
          <div>
            <h2>Convite de acesso</h2>
            <p>Enviaremos um link de uso único ao telefone registrado no cadastro do cliente.</p>
          </div>
        </div>

        {customers.length ? (
          <form className="form-grid two-fields" onSubmit={submit}>
            <label>
              Cliente cadastrado
              <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="" disabled>
                  Selecione o cliente
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.phone}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="primary" disabled={busy}>
                {busy ? 'Gerando…' : 'Gerar convite'}
              </button>
            </div>
          </form>
        ) : (
          <div className="inline-empty">
            Cadastre o cliente antes de gerar o convite.{' '}
            <button type="button" className="inline-link" onClick={onGoToClients}>
              Ir para Clientes
            </button>
          </div>
        )}

        {invite && (
          <div className="invite-result">
            <b>Convite pronto para compartilhar</b>
            <p>Validade: {formatDateTime(invite.expiresAt)}</p>
            <label>
              Link de ativação
              <input readOnly value={`${location.origin}${invite.activationUrl}`} />
            </label>
            <p className="invite-code">
              Código de demonstração: <b>{invite.devCode || 'enviado pelo canal configurado'}</b>
            </p>
          </div>
        )}
      </section>
    </>
  );
}
