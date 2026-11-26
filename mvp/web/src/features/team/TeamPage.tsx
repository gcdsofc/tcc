import { useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useAsync, useResource } from '../../app/hooks';
import { primaryStaffRole } from '../../app/permissions';
import { initials } from '../../app/format';
import { identityService } from '../../services/identity';
import { EmptyState, Feedback, Loading, PageHeading, SectionTitle, Stat } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { TeamMember, TenantRole } from '../../types/api';

type StaffRole = Exclude<TenantRole, 'customer'>;

const staffRoles: { id: StaffRole; label: string; plural: string; tone: 'teal' | 'blue' | 'amber' | 'green' }[] = [
  { id: 'tenant_admin', label: 'Administrador', plural: 'Administradores', tone: 'teal' },
  { id: 'attendant', label: 'Atendente', plural: 'Atendentes', tone: 'blue' },
  { id: 'mechanic', label: 'Mecânico', plural: 'Mecânicos', tone: 'amber' },
  { id: 'finance', label: 'Financeiro', plural: 'Financeiro', tone: 'green' },
];

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  password: string;
}

const emptyMember: MemberForm = { name: '', email: '', phone: '', role: 'attendant', password: '' };

export function TeamPage() {
  const { tenantToken, user } = useSession();
  const members = useResource<TeamMember[]>(
    (signal) => identityService.listTeam(tenantToken, signal),
    [tenantToken],
  );
  const { busy, error, notice, run, setNotice } = useAsync();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyMember);

  const field = (key: keyof MemberForm) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const list = members.data ?? [];
  const active = list.filter((member) => member.status === 'active');

  const addMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      const created = await identityService.addMember(tenantToken, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        password: form.password || undefined,
      });
      members.reload();
      setForm(emptyMember);
      setAdding(false);
      setNotice(
        created.account === 'existing'
          ? `${created.name} já tinha conta GarageOps e agora faz parte da equipe.`
          : `${created.name} cadastrado. Passe o e-mail e a senha inicial para a pessoa entrar.`,
      );
    });
  };

  const changeRole = (member: TeamMember, role: StaffRole) =>
    void run(async () => {
      await identityService.updateMember(tenantToken, member.id, { role });
      members.reload();
    }, `Papel de ${member.name} atualizado.`);

  const toggleStatus = (member: TeamMember) =>
    void run(async () => {
      const nextStatus = member.status === 'active' ? 'inactive' : 'active';
      await identityService.updateMember(tenantToken, member.id, { status: nextStatus });
      members.reload();
    }, member.status === 'active' ? `${member.name} não consegue mais abrir esta oficina.` : `${member.name} reativado.`);

  return (
    <>
      <PageHeading
        title="Equipe"
        description="Cadastre as pessoas que trabalham nesta oficina e defina o papel de cada uma."
      >
        <button type="button" className="primary" onClick={() => setAdding((open) => !open)}>
          {adding ? 'Fechar cadastro' : (<><Icon name="plus" size={15} /> Novo membro</>)}
        </button>
      </PageHeading>

      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />

      <section className="stat-grid">
        {staffRoles.map((role) => (
          <Stat
            key={role.id}
            label={role.plural}
            value={active.filter((member) => primaryStaffRole(member.roles) === role.id).length}
            icon="clients"
            tone={role.tone}
          />
        ))}
      </section>

      {adding && (
        <section className="content-card">
          <SectionTitle
            icon="plus"
            title="Novo membro da equipe"
            description="Se o e-mail já tiver conta GarageOps, a conta é reaproveitada e só o vínculo com esta oficina é criado."
          />
          <form className="platform-form" onSubmit={addMember}>
            <fieldset>
              <legend>Pessoa</legend>
              <label>
                Nome completo
                <input required maxLength={80} {...field('name')} />
              </label>
              <label>
                E-mail
                <input required type="email" {...field('email')} />
              </label>
              <label>
                Telefone
                <input required type="tel" placeholder="+5511999999999" {...field('phone')} />
              </label>
            </fieldset>
            <fieldset>
              <legend>Acesso</legend>
              <label>
                Papel nesta oficina
                <select required {...field('role')}>
                  {staffRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Senha inicial <span className="optional">Mín. 12 caracteres · só para conta nova</span>
                <input type="password" minLength={12} autoComplete="new-password" {...field('password')} />
              </label>
              <p className="muted small-note">Clientes não entram por aqui: eles recebem o convite de acesso.</p>
            </fieldset>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAdding(false);
                  setForm(emptyMember);
                }}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Cadastrando…' : 'Cadastrar membro'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card">
        <SectionTitle icon="clients" title="Membros" description={`${active.length} ativo(s) de ${list.length}`} />
        {members.loading && <Loading label="Carregando a equipe…" />}
        {members.error && <Feedback error={members.error} />}
        <div className="tenant-list">
          {list.map((member) => {
            const self = member.user_id === user?.id;
            const role = primaryStaffRole(member.roles) as StaffRole | undefined;
            return (
              <article className={`tenant-row ${member.status === 'active' ? 'active' : 'suspended'}`} key={member.id}>
                <div className="tenant-main team-main">
                  <span className="customer-avatar">{initials(member.name)}</span>
                  <div>
                    <b>
                      {member.name}
                      {self ? ' (você)' : ''}
                    </b>
                    <small>
                      {member.email} · {member.phone || 'sem telefone'}
                    </small>
                  </div>
                  <select
                    className="filter-select"
                    aria-label={`Papel de ${member.name}`}
                    value={role}
                    disabled={self || busy || member.status !== 'active'}
                    onChange={(event) => changeRole(member, event.target.value as StaffRole)}
                  >
                    {staffRoles.map((staffRole) => (
                      <option key={staffRole.id} value={staffRole.id}>
                        {staffRole.label}
                      </option>
                    ))}
                  </select>
                  <span className={`status-pill ${member.status === 'active' ? 'approved' : 'refused'}`}>
                    {member.status === 'active' ? 'Ativo' : 'Desativado'}
                  </span>
                  <span className="tenant-actions">
                    {!self && (
                      <button
                        type="button"
                        className={member.status === 'active' ? 'danger-button' : 'secondary'}
                        disabled={busy}
                        onClick={() => toggleStatus(member)}
                      >
                        {member.status === 'active' ? 'Desativar' : 'Reativar'}
                      </button>
                    )}
                  </span>
                </div>
              </article>
            );
          })}
          {!members.loading && !list.length && (
            <EmptyState title="Nenhum membro" detail="Use “Novo membro” para cadastrar a equipe." />
          )}
        </div>
      </section>
    </>
  );
}
