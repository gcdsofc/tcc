import type { EstimateStatus, OrderStatus, TenantRole } from '../types/api';

export const orderStatusLabels: Record<OrderStatus, string> = {
  open: 'Aberta',
  diagnosis: 'Em diagnóstico',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovada',
  in_progress: 'Em execução',
  ready: 'Pronta para retirada',
  closed: 'Concluída e paga',
  closed_refused: 'Encerrada por recusa',
};

export const estimateStatusLabels: Record<EstimateStatus, string> = {
  pending: 'Aguardando',
  approved: 'Aprovado',
  refused: 'Recusado',
  superseded: 'Substituído',
};

const roleLabels: Record<TenantRole, string> = {
  tenant_admin: 'Administrador',
  attendant: 'Atendente',
  mechanic: 'Mecânico',
  finance: 'Financeiro',
  customer: 'Cliente',
};

export function orderStatusLabel(status: string): string {
  return orderStatusLabels[status as OrderStatus] ?? status;
}

export function estimateStatusLabel(status: string): string {
  return estimateStatusLabels[status as EstimateStatus] ?? status;
}

export function roleLabel(role: string): string {
  return roleLabels[role as TenantRole] ?? role;
}

export function roleListLabel(roles: TenantRole[] | undefined): string {
  return (roles ?? []).map(roleLabel).join(' · ');
}

export function currency(value: number | string | null | undefined): string {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function initials(name: string | undefined, fallback = 'G'): string {
  return name?.trim().slice(0, 1).toUpperCase() || fallback;
}
