import { useState } from 'react';
import { AppShell, type NavItem } from '../components/AppShell';
import { Feedback } from '../components/ui';
import { capabilities } from './permissions';
import { useSession } from './session';
import { TenantDataProvider, useTenantData } from './tenant-data';
import { HomePage } from '../features/work-orders/HomePage';
import { OrderDetailPage } from '../features/work-orders/OrderDetailPage';
import { CustomersPage } from '../features/customers/CustomersPage';
import { VehiclesPage } from '../features/vehicles/VehiclesPage';
import { TeamPage } from '../features/team/TeamPage';
import { InvitesPage } from '../features/invites/InvitesPage';

type Page = 'home' | 'clients' | 'vehicles' | 'team' | 'invites' | 'detail';

function WorkspaceInner() {
  const { office, user, tenantRoles, clearOffice, signout, notice, setNotice } = useSession();
  const { orders } = useTenantData();
  const can = capabilities(tenantRoles);
  const [page, setPage] = useState<Page>('home');
  const [orderId, setOrderId] = useState('');

  if (!office) return null;

  const pendingCount = orders.filter((order) => order.status === 'awaiting_approval').length;

  const homeLabel = can.isCustomer
    ? 'Atendimentos'
    : can.isMechanic && !can.isStaff
      ? 'Fila de serviços'
      : can.isFinance && !can.isStaff
        ? 'Ordens e pagamentos'
        : 'Visão geral';

  const nav: NavItem[] = [
    { id: 'home', label: homeLabel, icon: 'dashboard', badge: pendingCount },
    ...(can.isStaff
      ? ([
          { id: 'clients', label: 'Clientes', icon: 'clients' },
          { id: 'vehicles', label: 'Veículos', icon: 'vehicle' },
        ] as NavItem[])
      : can.isCustomer
        ? ([{ id: 'vehicles', label: 'Meus veículos', icon: 'vehicle' }] as NavItem[])
        : can.isMechanic
          ? ([{ id: 'vehicles', label: 'Veículos da oficina', icon: 'vehicle' }] as NavItem[])
          : []),
    ...(can.isOwner
      ? ([
          { id: 'team', label: 'Equipe', icon: 'clients' },
          { id: 'invites', label: 'Acessos', icon: 'invite' },
        ] as NavItem[])
      : []),
  ];

  const navigate = (id: string) => {
    setPage(id as Page);
    setOrderId('');
    setNotice('');
  };

  const openOrder = (id: string) => {
    setOrderId(id);
    setPage('detail');
    setNotice('');
  };

  const breadcrumb =
    page === 'detail' ? 'Detalhes da ordem' : nav.find((item) => item.id === page)?.label ?? 'Visão geral';

  return (
    <AppShell
      office={office}
      user={user}
      roles={tenantRoles}
      nav={nav}
      activePage={page}
      breadcrumb={breadcrumb}
      onNavigate={navigate}
      onSwitchOffice={() => clearOffice()}
      onSignout={signout}
    >
      {notice && <Feedback notice={notice} onDismiss={() => setNotice('')} />}

      {page === 'home' && <HomePage onOpenOrder={openOrder} onGoToClients={() => navigate('clients')} />}
      {page === 'clients' && can.isStaff && <CustomersPage />}
      {page === 'vehicles' && (
        <VehiclesPage onOpenOrder={openOrder} onGoToClients={() => navigate('clients')} />
      )}
      {page === 'team' && can.isOwner && <TeamPage />}
      {page === 'invites' && can.isOwner && <InvitesPage onGoToClients={() => navigate('clients')} />}
      {page === 'detail' && orderId && (
        <OrderDetailPage orderId={orderId} onBack={() => setPage('home')} />
      )}
    </AppShell>
  );
}

export function Workspace() {
  return (
    <TenantDataProvider>
      <WorkspaceInner />
    </TenantDataProvider>
  );
}
