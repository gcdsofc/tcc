// Regras puras da gestão de equipe pelo administrador da oficina (RF-005), testadas sem banco.

/** Papéis que o administrador da oficina pode atribuir. Cliente só entra por convite. */
export const STAFF_ROLES = ['tenant_admin', 'attendant', 'mechanic', 'finance'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const isStaffRole = (value: unknown): value is StaffRole =>
  typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value);

export interface MemberChange {
  actorUserId: string;
  targetUserId: string;
  currentRoles: string[];
  currentStatus: string;
  nextRole?: string;
  nextStatus?: string;
  /** Quantos administradores ativos a oficina tem hoje (incluindo o alvo, se for um). */
  activeAdmins: number;
}

/** Devolve o motivo da recusa, ou null quando a alteração é permitida. */
export function rejectMemberChange(change: MemberChange): string | null {
  if (change.actorUserId === change.targetUserId) {
    return 'Você não pode alterar o seu próprio acesso. Peça para outro administrador da oficina.';
  }
  if (change.nextRole !== undefined && !isStaffRole(change.nextRole)) return 'Papel inválido.';
  if (change.nextStatus !== undefined && !['active', 'inactive'].includes(change.nextStatus)) return 'Situação inválida.';
  if (change.currentRoles.includes('customer') && !change.currentRoles.some(isStaffRole)) {
    return 'Clientes são gerenciados pelo convite de acesso, não pela equipe.';
  }
  const isActiveAdmin = change.currentStatus === 'active' && change.currentRoles.includes('tenant_admin');
  const losesAdmin = (change.nextRole !== undefined && change.nextRole !== 'tenant_admin') || change.nextStatus === 'inactive';
  if (isActiveAdmin && losesAdmin && change.activeAdmins <= 1) {
    return 'A oficina precisa ter pelo menos um administrador ativo.';
  }
  return null;
}

/** Ao trocar o papel de equipe, mantém o papel de cliente se a pessoa também for cliente da oficina. */
export function nextRoles(currentRoles: string[], nextRole: StaffRole): string[] {
  return currentRoles.includes('customer') ? [nextRole, 'customer'] : [nextRole];
}
