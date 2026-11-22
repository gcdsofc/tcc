// Contrato de sessão do GarageOps, compartilhado pelos três microsserviços.
// Base: fundação de autenticação proposta pelo Thiago (scope + activeTenantId + roles).

export const TOKEN_ISSUER = 'garageops-identity';
export const TOKEN_TTL = '8h';

export const TENANT_ROLES = [
  'tenant_admin',
  'attendant',
  'mechanic',
  'finance',
  'customer',
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];
export type PrincipalRole = TenantRole | 'platform_admin';

/**
 * account  -> pessoa autenticada que ainda não escolheu uma oficina (lista vínculos, aceita convite)
 * tenant   -> sessão de trabalho dentro de uma oficina ativa, com os papéis daquele vínculo
 * platform -> administrador da plataforma; nunca carrega oficina nem papel operacional
 */
export type PrincipalScope = 'account' | 'tenant' | 'platform';

export interface AuthPrincipal {
  userId: string;
  name: string;
  email: string;
  scope: PrincipalScope;
  roles: PrincipalRole[];
  activeTenantId?: string;
  tenantName?: string;
}

export interface TenantPrincipal extends AuthPrincipal {
  scope: 'tenant';
  activeTenantId: string;
  roles: TenantRole[];
}

export interface JwtClaims {
  sub?: unknown;
  name?: unknown;
  email?: unknown;
  scope?: unknown;
  roles?: unknown;
  activeTenantId?: unknown;
  tenantName?: unknown;
  [claim: string]: unknown;
}
