import { ForbiddenException } from '@nestjs/common';
import { assertAccessPolicy } from '../src/auth/access-policy';
import { AuthPrincipal } from '../src/auth/auth.types';

const tenant: AuthPrincipal = { userId: 'u1', name: '', email: '', scope: 'tenant', activeTenantId: '8a2c6f84-22d1-4c35-91d0-d3cabdb88a00', roles: ['attendant'] };
const account: AuthPrincipal = { userId: 'u1', name: '', email: '', scope: 'account', roles: [] };
const platform: AuthPrincipal = { userId: 'p1', name: '', email: '', scope: 'platform', roles: ['platform_admin'] };

describe('assertAccessPolicy', () => {
  it('permite papel explicitamente autorizado no tenant ativo', () => {
    expect(() => assertAccessPolicy({ kind: 'tenant', roles: ['attendant'] }, tenant)).not.toThrow();
  });

  it('nega rota sem política explícita', () => {
    expect(() => assertAccessPolicy(undefined, tenant)).toThrow(ForbiddenException);
  });

  it('nega papel não autorizado e política sem papéis', () => {
    expect(() => assertAccessPolicy({ kind: 'tenant', roles: ['mechanic'] }, tenant)).toThrow(ForbiddenException);
    expect(() => assertAccessPolicy({ kind: 'tenant', roles: [] }, tenant)).toThrow(ForbiddenException);
  });

  it('nega conta sem oficina em rota de oficina', () => {
    expect(() => assertAccessPolicy({ kind: 'tenant', roles: ['attendant'] }, account)).toThrow(ForbiddenException);
  });

  it('nega administrador da plataforma em rota operacional e de conta', () => {
    expect(() => assertAccessPolicy({ kind: 'tenant', roles: ['tenant_admin'] }, platform)).toThrow(ForbiddenException);
    expect(() => assertAccessPolicy({ kind: 'account' }, platform)).toThrow(ForbiddenException);
  });

  it('rota de conta aceita conta com ou sem oficina ativa', () => {
    expect(() => assertAccessPolicy({ kind: 'account' }, account)).not.toThrow();
    expect(() => assertAccessPolicy({ kind: 'account' }, tenant)).not.toThrow();
  });

  it('permite plataforma apenas na política da plataforma', () => {
    expect(() => assertAccessPolicy({ kind: 'platform' }, platform)).not.toThrow();
    expect(() => assertAccessPolicy({ kind: 'platform' }, tenant)).toThrow(ForbiddenException);
    expect(() => assertAccessPolicy({ kind: 'platform' }, account)).toThrow(ForbiddenException);
  });
});
