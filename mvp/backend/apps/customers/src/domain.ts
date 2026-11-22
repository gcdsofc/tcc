// Regras puras do domínio de clientes (testadas sem banco).

/** Cliente só lê o perfil local ligado à própria identidade; equipe da oficina lê qualquer perfil do tenant. */
export function canReadProfile(roles: readonly string[], userId: string, profileUserId: string | null): boolean {
  return !roles.includes('customer') || userId === profileUserId;
}

export function belongsToTenant(recordTenantId: string, activeTenantId: string): boolean {
  return recordTenantId === activeTenantId;
}

/** CEP só com dígitos; null quando vazio. Lança erro se tiver tamanho errado. */
export function normalizeCep(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length !== 8) throw new Error('CEP deve conter oito dígitos.');
  return digits;
}

/** Código FIPE no formato 000000-0; qualquer outra coisa é descartada. */
export function normalizeFipeCode(value: unknown): string | null {
  const code = String(value ?? '');
  return /^\d{6}-\d$/.test(code) ? code : null;
}

export function validFipeParams(params: { brand?: string; model?: string; year?: string }): boolean {
  return (!params.brand || /^\d{1,6}$/.test(params.brand))
    && (!params.model || /^\d{1,7}$/.test(params.model))
    && (!params.year || /^\d{4,5}-\d$/.test(params.year));
}
