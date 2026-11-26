import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../services/http';
import { identityService } from '../../services/identity';
import { useSession } from '../../app/session';
import { useAsync } from '../../app/hooks';
import { formatDate, initials } from '../../app/format';
import { Brand, EmptyState, Feedback, Loading, PageHeading, SectionTitle, Stat } from '../../components/ui';
import { Icon } from '../../components/Icon';
import type { PlatformTenant } from '../../types/api';

const brandPalette = ['#0f766e', '#2563eb', '#d97706', '#7c3aed', '#be123c', '#0891b2', '#4d7c0f', '#334155'];

interface TenantForm {
  name: string;
  slug: string;
  brandColor: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerPassword: string;
}

const emptyForm: TenantForm = {
  name: '',
  slug: '',
  brandColor: brandPalette[0],
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  ownerPassword: '',
};

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="color-picker">
      <span>Cor de identificação</span>
      <div>
        {brandPalette.map((color) => (
          <button
            type="button"
            key={color}
            className={value === color ? 'picked' : ''}
            style={{ background: color }}
            onClick={() => onChange(color)}
            aria-label={`Cor ${color}`}
          />
        ))}
        <input
          type="color"
          value={value || '#0f766e'}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Outra cor"
        />
      </div>
    </div>
  );
}

export function PlatformConsole() {
  const { globalToken, user, signout, handleSessionError } = useSession();
  const { busy, error, notice, run, setNotice } = useAsync();

  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState<Partial<TenantForm>>({});
  const [deletingId, setDeletingId] = useState('');
  const [confirmSlug, setConfirmSlug] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setTenants(await identityService.listTenants(globalToken));
    } catch (err) {
      if (!handleSessionError(err)) {
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar as oficinas.');
      }
    } finally {
      setLoading(false);
    }
  }, [globalToken, handleSessionError]);

  useEffect(() => {
    void load();
  }, [load]);

  const field = (key: keyof TenantForm) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const editField = (key: keyof TenantForm) => ({
    value: editForm[key] ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm((current) => ({ ...current, [key]: event.target.value })),
  });

  const createTenant = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      const created = await identityService.createTenant(globalToken, {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        brandColor: form.brandColor,
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        ownerPhone: form.ownerPhone.trim(),
        ownerPassword: form.ownerPassword || undefined,
      });
      await load();
      setForm(emptyForm);
      setCreating(false);
      setNotice(
        created.ownerAccount === 'existing'
          ? `Oficina ${created.name} cadastrada. A conta GarageOps existente recebeu o papel de administrador.`
          : `Oficina ${created.name} cadastrada com o administrador ${form.ownerEmail}.`,
      );
    });
  };

  const startEdit = (tenant: PlatformTenant) => {
    setDeletingId('');
    setEditingId(tenant.id);
    setEditForm({ name: tenant.name, slug: tenant.slug, brandColor: tenant.brand_color });
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      await identityService.updateTenant(globalToken, editingId, {
        name: editForm.name,
        slug: editForm.slug,
        brandColor: editForm.brandColor,
      });
      await load();
      setEditingId('');
    }, 'Cadastro da oficina atualizado.');
  };

  const toggleStatus = (tenant: PlatformTenant) =>
    void run(async () => {
      await identityService.updateTenant(globalToken, tenant.id, {
        status: tenant.status === 'active' ? 'suspended' : 'active',
      });
      await load();
    }, tenant.status === 'active'
      ? `${tenant.name} suspensa: a equipe e os clientes não conseguem mais abri-la.`
      : `${tenant.name} reativada.`);

  const removeTenant = (event: FormEvent<HTMLFormElement>, tenant: PlatformTenant) => {
    event.preventDefault();
    void run(async () => {
      await identityService.deleteTenant(globalToken, tenant.id, confirmSlug);
      await load();
      setDeletingId('');
      setConfirmSlug('');
    }, `${tenant.name} excluída junto com todos os dados dela.`);
  };

  const visible = tenants.filter((tenant) =>
    `${tenant.name} ${tenant.slug}`.toLowerCase().includes(search.toLowerCase()),
  );
  const activeCount = tenants.filter((tenant) => tenant.status === 'active').length;
  const teamTotal = tenants.reduce((sum, tenant) => sum + tenant.team_accounts, 0);
  const customerTotal = tenants.reduce((sum, tenant) => sum + tenant.customer_accounts, 0);

  return (
    <div className="app-shell platform-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-stack">
            <Brand variant="garageops-horizontal-dark" height={28} alt="GarageOps" />
            <small>Plataforma</small>
          </div>
        </div>
        <div className="sidebar-label">Console técnico</div>
        <nav className="side-nav" aria-label="Navegação principal">
          <button type="button" className="selected" aria-current="page">
            <span className="nav-icon">
              <Icon name="dashboard" size={18} />
            </span>
            <span className="nav-text">Oficinas</span>
          </button>
        </nav>
        <div className="platform-privacy">
          <b>Sigilo das oficinas</b>
          <p>
            Este console não acessa clientes, veículos, ordens, orçamentos, conversas nem pagamentos.
            A API recusa esses pedidos para esta conta.
          </p>
        </div>
        <div className="sidebar-bottom">
          <div className="account-mini">
            <span className="avatar">{initials(user?.name, 'P')}</span>
            <span>
              <b>{user?.name}</b>
              <small>Administrador da plataforma</small>
            </span>
          </div>
          <button type="button" className="logout-button" onClick={signout}>
            <Icon name="logout" size={14} /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            GarageOps <span aria-hidden="true">/</span> Plataforma <span aria-hidden="true">/</span> <b>Oficinas</b>
          </div>
          {/* No celular a barra lateral vira barra inferior: título e saída sobem para cá. */}
          <span className="topbar-office topbar-title">
            <Brand variant="garageops-horizontal" height={22} alt="GarageOps" />
            <span className="topbar-office-name">Console da plataforma</span>
          </span>
          <div className="topbar-right">
            <button type="button" className="topbar-logout" onClick={signout} aria-label="Sair da conta">
              <Icon name="logout" size={18} />
            </button>
            <span className="secure-label">
              <i /> Ambiente demonstrativo
            </span>
            <span className="avatar small-avatar">{initials(user?.name, 'P')}</span>
          </div>
        </header>

        <div className="page-content page-enter">
          <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />

          <PageHeading
            title="Oficinas da plataforma"
            description="Cadastre, edite, suspenda ou exclua oficinas. Os dados operacionais de cada uma ficam fora do seu alcance."
          >
            <button
              type="button"
              className="primary"
              onClick={() => {
                setCreating((open) => !open);
                setEditingId('');
                setDeletingId('');
              }}
            >
              {creating ? 'Fechar cadastro' : (<><Icon name="plus" size={15} /> Nova oficina</>)}
            </button>
          </PageHeading>

          <section className="stat-grid">
            <Stat label="Oficinas cadastradas" value={tenants.length} icon="dashboard" tone="teal" />
            <Stat label="Ativas" value={activeCount} icon="check" tone="green" />
            <Stat label="Contas de equipe" value={teamTotal} icon="clients" tone="blue" />
            <Stat label="Contas de cliente" value={customerTotal} icon="clock" tone="amber" />
          </section>

          {creating && (
            <section className="content-card">
              <SectionTitle
                icon="plus"
                title="Cadastrar oficina"
                description="Cria o tenant e o vínculo de administrador. Se o e-mail já tiver conta GarageOps, a conta existente é reaproveitada."
              />
              <form className="platform-form" onSubmit={createTenant}>
                <fieldset>
                  <legend>Oficina</legend>
                  <label>
                    Nome da oficina
                    <input required maxLength={80} placeholder="Ex.: Auto Mecânica Silva" {...field('name')} />
                  </label>
                  <label>
                    Identificador <span className="optional">Gerado pelo nome se vazio</span>
                    <input maxLength={60} pattern="[A-Za-z0-9-]*" placeholder="auto-mecanica-silva" {...field('slug')} />
                  </label>
                  <ColorPicker value={form.brandColor} onChange={(brandColor) => setForm((current) => ({ ...current, brandColor }))} />
                </fieldset>
                <fieldset>
                  <legend>Administrador da oficina</legend>
                  <label>
                    Nome
                    <input required maxLength={80} {...field('ownerName')} />
                  </label>
                  <label>
                    E-mail
                    <input required type="email" {...field('ownerEmail')} />
                  </label>
                  <label>
                    Telefone
                    <input required type="tel" placeholder="+5511999999999" {...field('ownerPhone')} />
                  </label>
                  <label>
                    Senha inicial <span className="optional">Mín. 12 caracteres · só para conta nova</span>
                    <input type="password" minLength={12} autoComplete="new-password" {...field('ownerPassword')} />
                  </label>
                </fieldset>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setCreating(false);
                      setForm(emptyForm);
                    }}
                  >
                    Cancelar
                  </button>
                  <button className="primary" disabled={busy}>
                    {busy ? 'Cadastrando…' : 'Cadastrar oficina'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="content-card">
            <SectionTitle
              icon="dashboard"
              title="Oficinas"
              description={`${tenants.length} tenant(s) · somente dados cadastrais e contagens`}
            >
              <input
                className="search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar oficina"
                aria-label="Buscar oficina"
              />
            </SectionTitle>

            {loading && <Loading label="Carregando oficinas…" />}
            {loadError && <Feedback error={loadError} />}

            <div className="tenant-list">
              {visible.map((tenant) => (
                <article className={`tenant-row ${tenant.status}`} key={tenant.id}>
                  <div className="tenant-main">
                    <span className="office-mark" style={{ ['--brand' as string]: tenant.brand_color }}>
                      <i />
                    </span>
                    <div>
                      <b>{tenant.name}</b>
                      <small>
                        {tenant.slug} · ID {tenant.id.slice(-8).toUpperCase()} · desde {formatDate(tenant.created_at)}
                      </small>
                    </div>
                    <span className="tenant-counts">
                      <span>
                        <b>{tenant.team_accounts}</b> equipe
                      </span>
                      <span>
                        <b>{tenant.customer_accounts}</b> clientes
                      </span>
                    </span>
                    <span className={`status-pill ${tenant.status === 'active' ? 'approved' : 'refused'}`}>
                      {tenant.status === 'active' ? 'Ativa' : 'Suspensa'}
                    </span>
                    <span className="tenant-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => (editingId === tenant.id ? setEditingId('') : startEdit(tenant))}
                      >
                        Editar
                      </button>
                      <button type="button" className="secondary" disabled={busy} onClick={() => toggleStatus(tenant)}>
                        {tenant.status === 'active' ? 'Suspender' : 'Reativar'}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => {
                          setEditingId('');
                          setConfirmSlug('');
                          setDeletingId(deletingId === tenant.id ? '' : tenant.id);
                        }}
                      >
                        Excluir
                      </button>
                    </span>
                  </div>

                  {editingId === tenant.id && (
                    <form className="tenant-panel" onSubmit={saveEdit}>
                      <label>
                        Nome da oficina
                        <input required maxLength={80} {...editField('name')} />
                      </label>
                      <label>
                        Identificador
                        <input required maxLength={60} pattern="[A-Za-z0-9-]+" {...editField('slug')} />
                      </label>
                      <ColorPicker
                        value={editForm.brandColor ?? tenant.brand_color}
                        onChange={(brandColor) => setEditForm((current) => ({ ...current, brandColor }))}
                      />
                      <div className="form-actions">
                        <button type="button" className="secondary" onClick={() => setEditingId('')}>
                          Cancelar
                        </button>
                        <button className="primary" disabled={busy}>
                          {busy ? 'Salvando…' : 'Salvar alterações'}
                        </button>
                      </div>
                    </form>
                  )}

                  {deletingId === tenant.id && (
                    <form className="tenant-panel danger-zone" onSubmit={(event) => removeTenant(event, tenant)}>
                      <p>
                        <b>Excluir {tenant.name} definitivamente?</b> Os clientes, veículos, ordens,
                        orçamentos, conversas, pagamentos, convites e vínculos dessa oficina serão
                        apagados e não poderão ser recuperados. As contas GarageOps das pessoas
                        continuam existindo. Se a ideia é só bloquear o acesso, use <i>Suspender</i>.
                      </p>
                      <label>
                        Digite <code>{tenant.slug}</code> para confirmar
                        <input value={confirmSlug} onChange={(event) => setConfirmSlug(event.target.value)} autoComplete="off" />
                      </label>
                      <div className="form-actions">
                        <button type="button" className="secondary" onClick={() => setDeletingId('')}>
                          Cancelar
                        </button>
                        <button className="danger-button" disabled={busy || confirmSlug !== tenant.slug}>
                          {busy ? 'Excluindo…' : 'Excluir oficina'}
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
              {!loading && !visible.length && (
                <EmptyState
                  title={tenants.length ? 'Nenhuma oficina encontrada' : 'Nenhuma oficina cadastrada'}
                  detail={tenants.length ? 'Tente outro nome ou identificador.' : 'Use “Nova oficina” para cadastrar a primeira.'}
                />
              )}
            </div>
          </section>
        </div>
        <footer className="app-footer">
          GarageOps · console da plataforma · sem acesso a dados operacionais das oficinas
        </footer>
      </main>
    </div>
  );
}
