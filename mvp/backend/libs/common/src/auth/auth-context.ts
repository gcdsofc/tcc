import { UnauthorizedException } from '@nestjs/common';
import { AuthPrincipal, JwtClaims, PrincipalRole, TENANT_ROLES } from './auth.types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALL_ROLES: readonly PrincipalRole[] = [...TENANT_ROLES, 'platform_admin'];

function invalid(): never {
  throw new UnauthorizedException('Credenciais inválidas.');
}

/** Monta o principal só a partir do token já verificado; nunca lê oficina do body/query/header. */
export function principalFromVerifiedClaims(claims: JwtClaims): AuthPrincipal {
  if (typeof claims.sub !== 'string' || claims.sub.trim().length === 0) invalid();
  const name = typeof claims.name === 'string' ? claims.name : '';
  const email = typeof claims.email === 'string' ? claims.email : '';
  const rawRoles = claims.roles === undefined ? [] : claims.roles;
  if (!Array.isArray(rawRoles)) invalid();
  if (!rawRoles.every((role): role is PrincipalRole => typeof role === 'string' && ALL_ROLES.includes(role as PrincipalRole))) invalid();
  const roles = [...new Set(rawRoles)] as PrincipalRole[];
  const base = { userId: claims.sub, name, email };

  if (claims.scope === 'account') {
    // Conta sem oficina escolhida: não carrega papel nem tenant.
    if (roles.length || claims.activeTenantId !== undefined) invalid();
    return { ...base, scope: 'account', roles: [] };
  }

  if (claims.scope === 'tenant') {
    if (typeof claims.activeTenantId !== 'string' || !UUID.test(claims.activeTenantId)) invalid();
    if (roles.length === 0 || roles.includes('platform_admin')) invalid();
    return {
      ...base,
      scope: 'tenant',
      roles,
      activeTenantId: claims.activeTenantId,
      tenantName: typeof claims.tenantName === 'string' ? claims.tenantName : undefined,
    };
  }

  if (claims.scope === 'platform') {
    // Plataforma não tem oficina e não pode carregar papel operacional.
    if (claims.activeTenantId !== undefined || roles.length !== 1 || roles[0] !== 'platform_admin') invalid();
    return { ...base, scope: 'platform', roles };
  }

  return invalid();
}
