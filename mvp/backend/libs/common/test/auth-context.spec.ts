import { UnauthorizedException } from '@nestjs/common';
import { principalFromVerifiedClaims } from '../src/auth/auth-context';

const TENANT = '8a2c6f84-22d1-4c35-91d0-d3cabdb88a00';

describe('principalFromVerifiedClaims', () => {
  it('aceita contexto de oficina com tenant e papel válidos', () => {
    expect(principalFromVerifiedClaims({ sub: 'user-123', name: 'Ana', email: 'a@x', scope: 'tenant', activeTenantId: TENANT, roles: ['attendant'] }))
      .toEqual({ userId: 'user-123', name: 'Ana', email: 'a@x', scope: 'tenant', activeTenantId: TENANT, roles: ['attendant'], tenantName: undefined });
  });

  it('aceita conta sem oficina escolhida, sem papel', () => {
    expect(principalFromVerifiedClaims({ sub: 'user-1', scope: 'account' })).toMatchObject({ scope: 'account', roles: [] });
  });

  it('rejeita conta sem oficina carregando papel ou tenant', () => {
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'account', roles: ['attendant'] })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'account', activeTenantId: TENANT })).toThrow(UnauthorizedException);
  });

  it('rejeita tenant ausente ou malformado', () => {
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'tenant', roles: ['attendant'] })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'tenant', activeTenantId: 'oficina-1', roles: ['attendant'] })).toThrow(UnauthorizedException);
  });

  it('rejeita papel desconhecido e escopo desconhecido', () => {
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'tenant', activeTenantId: TENANT, roles: ['superuser'] })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ sub: 'u', scope: 'root', roles: [] })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ scope: 'account' })).toThrow(UnauthorizedException);
  });

  it('mantém administrador da plataforma sem contexto de oficina', () => {
    expect(principalFromVerifiedClaims({ sub: 'p1', scope: 'platform', roles: ['platform_admin'] })).toMatchObject({ scope: 'platform', roles: ['platform_admin'] });
  });

  it('rejeita administrador da plataforma com tenant ou papel operacional', () => {
    expect(() => principalFromVerifiedClaims({ sub: 'p1', scope: 'platform', roles: ['platform_admin'], activeTenantId: TENANT })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ sub: 'p1', scope: 'platform', roles: ['platform_admin', 'attendant'] })).toThrow(UnauthorizedException);
    expect(() => principalFromVerifiedClaims({ sub: 'p1', scope: 'tenant', activeTenantId: TENANT, roles: ['platform_admin'] })).toThrow(UnauthorizedException);
  });
});
