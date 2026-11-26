import { useState } from 'react';
import { useSession } from './app/session';
import { Workspace } from './app/Workspace';
import { Loading } from './components/ui';
import { LoginPage } from './features/access/LoginPage';
import { OfficePicker } from './features/access/OfficePicker';
import { ActivateInvitePage, AcceptInvitePage } from './features/access/InviteScreens';
import { PlatformConsole } from './features/platform/PlatformConsole';

function inviteTokenFromUrl(): string | null {
  return new URLSearchParams(location.search).get('token');
}

export default function App() {
  const { ready, globalToken, platform, tenantToken } = useSession();
  // Quando a pessoa com convite escolhe "já tenho conta", vai para o login normal.
  const [inviteLogin, setInviteLogin] = useState(false);
  const inviteToken = inviteTokenFromUrl();

  // Convite para conta nova (sem sessão): ativar a conta.
  if (inviteToken && !globalToken && !inviteLogin) {
    return <ActivateInvitePage inviteToken={inviteToken} onHasAccount={() => setInviteLogin(true)} />;
  }

  // Sem sessão: login.
  if (!globalToken) {
    return <LoginPage />;
  }

  // Administrador da plataforma: console próprio.
  if (platform) {
    return <PlatformConsole />;
  }

  // Logado e com convite pendente: confirmar o novo vínculo de oficina.
  if (inviteToken && !tenantToken) {
    return <AcceptInvitePage inviteToken={inviteToken} />;
  }

  // Logado, sem oficina ativa: escolher oficina.
  if (!tenantToken) {
    return <OfficePicker />;
  }

  // Validando o token da oficina antes de liberar as telas.
  if (!ready) {
    return (
      <main className="auth-screen single">
        <section className="auth-card">
          <Loading label="Preparando sua oficina…" />
        </section>
      </main>
    );
  }

  return <Workspace />;
}
