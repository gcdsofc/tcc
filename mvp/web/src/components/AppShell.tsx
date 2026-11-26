import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Brand } from './ui';
import { Icon, type IconName } from './Icon';
import { initials, roleListLabel } from '../app/format';
import type { Office, TenantRole, UserRef } from '../types/api';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  badge?: number;
}

interface AppShellProps {
  office: Office;
  user: UserRef | null;
  roles: TenantRole[];
  nav: NavItem[];
  activePage: string;
  breadcrumb: string;
  onNavigate: (id: string) => void;
  onSwitchOffice: () => void;
  onSignout: () => void;
  children: ReactNode;
}

/** Reanima a entrada do conteúdo a cada troca de tela, sem remontar os filhos (só aparência). */
function usePageEnter(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('page-enter');
    void el.offsetWidth; // reinicia a animação CSS
    el.classList.add('page-enter');
  }, [key]);
  return ref;
}

export function AppShell({
  office,
  user,
  roles,
  nav,
  activePage,
  breadcrumb,
  onNavigate,
  onSwitchOffice,
  onSignout,
  children,
}: AppShellProps) {
  const contentRef = usePageEnter(`${activePage}|${breadcrumb}`);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand variant="garageops-mark-white" height={32} />
          <div>
            <b>OficinaPro</b>
            <small>GarageOps</small>
          </div>
        </div>

        <button type="button" className="sidebar-office" onClick={onSwitchOffice}>
          <span className="office-dot" style={{ background: office.brand_color }} />
          <span>
            <b>{office.name}</b>
            <small>Trocar de oficina</small>
          </span>
          <span className="switch-icon">
            <Icon name="chevron-down" size={14} />
          </span>
        </button>

        <nav className="side-nav" aria-label="Navegação principal">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? 'selected' : ''}
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={18} />
              </span>
              <span className="nav-text">{item.label}</span>
              {item.badge ? <i className="nav-count">{item.badge}</i> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="account-mini">
            <span className="avatar">{initials(user?.name)}</span>
            <span>
              <b>{user?.name}</b>
              <small>{roleListLabel(roles)}</small>
            </span>
          </div>
          <button type="button" className="logout-button" onClick={onSignout}>
            <Icon name="logout" size={14} /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            GarageOps <span aria-hidden="true">/</span> <b>{breadcrumb}</b>
          </div>
          {/* No celular a barra lateral vira barra inferior: oficina e saída sobem para cá. */}
          <button type="button" className="topbar-office" onClick={onSwitchOffice}>
            <span className="office-dot" style={{ background: office.brand_color }} />
            <span className="topbar-office-name">{office.name}</span>
            <Icon name="chevron-down" size={14} />
            <span className="visually-hidden"> — trocar de oficina</span>
          </button>
          <div className="topbar-right">
            <button type="button" className="topbar-logout" onClick={onSignout} aria-label="Sair da conta">
              <Icon name="logout" size={18} />
            </button>
            <span className="secure-label">
              <i /> Ambiente demonstrativo
            </span>
            <span className="avatar small-avatar">{initials(user?.name)}</span>
          </div>
        </header>
        <div className="page-content page-enter" ref={contentRef}>
          {children}
        </div>
        <footer className="app-footer">
          <span>Desenvolvido por</span>
          <Brand variant="garageops-horizontal" height={18} alt="GarageOps" />
          <span>· ambiente demonstrativo · dados fictícios</span>
        </footer>
      </main>
    </div>
  );
}
