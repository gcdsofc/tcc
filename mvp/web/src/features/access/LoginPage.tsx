import { useState, type FormEvent } from 'react';
import { useSession } from '../../app/session';
import { useAsync } from '../../app/hooks';
import { Brand, Feedback } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { DEMO_PASSWORD, demoAccounts } from './demo-accounts';

interface LoginPageProps {
  onUseInvite?: () => void;
}

export function LoginPage({ onUseInvite }: LoginPageProps) {
  const { login } = useSession();
  const { busy, error, run } = useAsync();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() => login(email.trim(), password));
  };

  return (
    <main className="auth-screen login">
      {/* Um único cartão: formulário à esquerda, painel de marca à direita. */}
      <div className="login-card">
        <section className="auth-card login-panel" aria-labelledby="login-title">
          <div className="login-form">
            <div className="login-lockup">
              <Brand variant="oficinapro-stacked" height={112} alt="OficinaPro" className="login-logo" />
            </div>

            <h1 id="login-title">Bem-vindo de volta</h1>
            <p className="muted">Entre com sua conta ou escolha um perfil de demonstração.</p>

            <label className="demo-picker">
              Perfil de demonstração
              <select value={email} onChange={(event) => setEmail(event.target.value)}>
                <option value="">Selecione um perfil</option>
                {demoAccounts.map((group) => (
                  <optgroup label={group.group} key={group.group}>
                    {group.accounts.map((account) => (
                      <option key={account.email} value={account.email}>
                        {account.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <form onSubmit={submit}>
              <label>
                E-mail
                <span className="field-with-icon">
                  <Icon name="mail" size={18} className="field-icon" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
              </label>
              <label>
                Senha
                <span className="field-with-icon">
                  <Icon name="lock" size={18} className="field-icon" />
                  <input
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </span>
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Entrando…' : 'Entrar no sistema'}
              </button>
            </form>

            <Feedback error={error} />

            <div className="login-foot">
              {onUseInvite && (
                <button type="button" className="link-button" onClick={onUseInvite}>
                  Recebi um convite de acesso
                </button>
              )}
              <small className="auth-footnote">As contas de demonstração usam a senha descrita no README.</small>
            </div>
          </div>
        </section>

        <section className="login-brand" aria-label="Sobre o OficinaPro">
          <span className="login-env">
            <i aria-hidden="true" /> Ambiente demonstrativo · dados fictícios
          </span>
          <div className="login-statement">
            <h2>Que bom te ver.</h2>
            <p>Ordens de serviço, orçamentos, aprovações e pagamentos da sua oficina em um só lugar.</p>
          </div>
          <div className="login-seal">
            <small>Desenvolvido por</small>
            <Brand variant="garageops-horizontal" height={24} alt="GarageOps" />
          </div>
        </section>
      </div>
    </main>
  );
}
