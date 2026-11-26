import { useSession } from '../../app/session';
import { useAsync } from '../../app/hooks';
import { Brand, Feedback } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { roleListLabel } from '../../app/format';
import type { Office } from '../../types/api';

export function OfficePicker() {
  const { user, offices, selectOffice, signout, notice, setNotice } = useSession();
  const { busy, error, run } = useAsync();

  const choose = (office: Office) => void run(() => selectOffice(office));

  return (
    <main className="office-screen">
      <header className="office-top">
        <div className="brand-lockup">
          <Brand variant="oficinapro-horizontal" height={36} alt="OficinaPro" />
          <small>Plataforma de gestão GarageOps</small>
        </div>
        <button type="button" className="secondary" onClick={signout}>
          Sair
        </button>
      </header>

      <section className="office-intro">
        <h1>Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}.</h1>
        <p className="muted">
          Escolha uma oficina para acessar os atendimentos e os dados autorizados à sua conta.
        </p>
      </section>

      <Feedback error={error} notice={notice} onDismiss={() => setNotice('')} />

      <div className="office-grid">
        {offices.map((office) => (
          <button
            type="button"
            className="office-card"
            key={office.id}
            disabled={busy}
            onClick={() => choose(office)}
          >
            <span className="office-mark" style={{ ['--brand' as string]: office.brand_color }}>
              <i />
            </span>
            <span className="office-card-content">
              <b>{office.name}</b>
              <small>{roleListLabel(office.roles)}</small>
            </span>
            <span className="office-arrow">
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        ))}
        {!offices.length && (
          <div className="empty-state">
            <b>Nenhuma oficina vinculada ainda</b>
            <p>
              Peça ao administrador da oficina para enviar um convite de acesso ao seu telefone
              cadastrado.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
