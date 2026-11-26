import { useState, type FormEvent } from 'react';
import { ApiError } from '../../services/http';
import { identityService } from '../../services/identity';
import { useSession } from '../../app/session';
import { useAsync } from '../../app/hooks';
import { Brand, Feedback } from '../../components/ui';
import type { InvitePreview } from '../../types/api';

function clearInviteParam() {
  history.replaceState({}, '', location.pathname);
}

interface ActivateInviteProps {
  inviteToken: string;
  onHasAccount: () => void;
}

/** Ativação de conta nova a partir de um convite (cliente sem conta GarageOps). */
export function ActivateInvitePage({ inviteToken, onHasAccount }: ActivateInviteProps) {
  const { authenticate } = useSession();
  const { busy, error, run, setError } = useAsync();
  const [preview, setPreview] = useState<(InvitePreview & { code: string }) | null>(null);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const verify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      try {
        const found = await identityService.verifyInvite(inviteToken, code.trim());
        setPreview({ ...found, code: code.trim() });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && /Já tenho conta/.test(err.message)) {
          onHasAccount();
        }
        throw err;
      }
    });
  };

  const activate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preview) return;
    void run(async () => {
      const data = await identityService.activateInvite(
        inviteToken,
        preview.code,
        preview.email || email.trim(),
        password,
      );
      clearInviteParam();
      await authenticate(data);
    });
  };

  return (
    <main className="auth-screen single">
      <section className="auth-card">
        <Brand variant="oficinapro-horizontal" height={36} alt="OficinaPro" />
        <h1>Ative sua conta</h1>

        {!preview ? (
          <>
            <p className="muted">
              Digite o código enviado ao telefone convidado. Depois de confirmado, você verá os dados
              que a oficina cadastrou.
            </p>
            <form onSubmit={verify}>
              <label>
                Código recebido
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Confirmando…' : 'Confirmar código'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="muted">
              Código confirmado. Estes são os dados que a oficina cadastrou; se algo estiver errado,
              peça para a oficina corrigir antes de ativar.
            </p>
            <form onSubmit={activate}>
              <label>
                Nome
                <input value={preview.name} readOnly />
              </label>
              {preview.email ? (
                <label>
                  E-mail
                  <input value={preview.email} readOnly />
                </label>
              ) : (
                <label>
                  E-mail <small>A oficina não cadastrou um e-mail; informe o seu</small>
                  <input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              )}
              <label>
                Crie sua senha <small>Mínimo de 12 caracteres</small>
                <input
                  name="password"
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Ativando…' : 'Ativar conta'}
              </button>
            </form>
          </>
        )}

        <button
          type="button"
          className="secondary full-width"
          onClick={() => {
            setError('');
            onHasAccount();
          }}
        >
          Já tenho conta GarageOps: entrar
        </button>
        <Feedback error={error} />
      </section>
    </main>
  );
}

interface AcceptInviteProps {
  inviteToken: string;
}

/** Aceite de uma nova oficina por quem já tem conta GarageOps. */
export function AcceptInvitePage({ inviteToken }: AcceptInviteProps) {
  const { globalToken, refreshOffices, setNotice } = useSession();
  const { busy, error, run } = useAsync();
  const [code, setCode] = useState('');

  const accept = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      await identityService.acceptInvite(globalToken, inviteToken, code.trim());
      clearInviteParam();
      await refreshOffices();
      setNotice('Convite aceito. A oficina foi adicionada à sua conta.');
    });
  };

  return (
    <main className="auth-screen single">
      <section className="auth-card">
        <Brand variant="oficinapro-horizontal" height={36} alt="OficinaPro" />
        <h1>Confirmar convite</h1>
        <p className="muted">
          Digite o código enviado ao telefone registrado para adicionar esta oficina à sua conta.
        </p>
        <form onSubmit={accept}>
          <label>
            Código recebido
            <input
              name="code"
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Confirmando…' : 'Confirmar convite'}
          </button>
        </form>
        <Feedback error={error} />
        <button
          type="button"
          className="inline-link"
          disabled={busy}
          onClick={() => {
            clearInviteParam();
            void refreshOffices();
          }}
        >
          Continuar sem aceitar o convite
        </button>
      </section>
    </main>
  );
}
