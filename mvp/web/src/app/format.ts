import type { EstimateStatus, OrderStatus, OrderSummary, TenantRole } from '../types/api';

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

/** Marca, modelo e ano do veículo da ordem (ex.: "Fiat Uno 2015"); vazio se não houver. */
export function orderVehicleModel(order: Pick<OrderSummary, 'vehicle_make' | 'vehicle_model' | 'vehicle_year'>): string {
  return [order.vehicle_make, order.vehicle_model, order.vehicle_year].filter(Boolean).join(' ');
}

/**
 * Exibição do telefone canônico do backend (só dígitos, com 55; ver normalizePhone em libs/common).
 * "5511991000301" → "+55 (11) 99100-0301". Outros formatos são mostrados como vieram.
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(value);
  if (match) return `+55 (${match[1]}) ${match[2]}-${match[3]}`;
  return /^\d+$/.test(value) ? `+${value}` : value;
}
