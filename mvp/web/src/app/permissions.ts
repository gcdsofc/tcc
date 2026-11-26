import type { TenantRole } from '../types/api';

// Capacidades derivadas dos papéis do vínculo ativo.
// IMPORTANTE: isto só decide o que a interface mostra. A autorização real é sempre
// validada no servidor (ADR-009); a tela precisa tratar respostas 403 mesmo quando
// esconde a ação.

export interface Capabilities {
  isCustomer: boolean;
  isStaff: boolean; // administração ou atendimento
  isMechanic: boolean;
  isFinance: boolean;
  isOwner: boolean; // administrador da oficina: controla equipe e convites
  canReadPeople: boolean; // pode ler clientes e veículos
  canRegister: boolean; // cadastrar cliente/veículo
  canOpenOrders: boolean;
  canDiagnose: boolean;
  canCreateEstimate: boolean;
  canMessage: boolean;
  canFinance: boolean;
  canCloseRefusal: boolean;
}

const has = (roles: TenantRole[], ...allowed: TenantRole[]) =>
  roles.some((role) => allowed.includes(role));

export function capabilities(roles: TenantRole[] | undefined): Capabilities {
  const r = roles ?? [];
  const canRegister = has(r, 'tenant_admin', 'attendant');
  return {
    isCustomer: has(r, 'customer'),
    isStaff: has(r, 'tenant_admin', 'attendant'),
    isMechanic: has(r, 'mechanic'),
    isFinance: has(r, 'finance'),
    isOwner: has(r, 'tenant_admin'),
    canReadPeople: has(r, 'tenant_admin', 'attendant', 'mechanic', 'customer'),
    canRegister,
    canOpenOrders: canRegister,
    canDiagnose: has(r, 'tenant_admin', 'mechanic'),
    canCreateEstimate: has(r, 'tenant_admin', 'attendant', 'mechanic'),
    canMessage: has(r, 'tenant_admin', 'attendant', 'mechanic', 'customer'),
    canFinance: has(r, 'tenant_admin', 'finance'),
    canCloseRefusal: canRegister,
  };
}

/** Papel principal exibido para um vínculo (ignora o papel de cliente na equipe). */
export function primaryStaffRole(roles: TenantRole[]): TenantRole | undefined {
  return roles.find((role) => role !== 'customer');
}
