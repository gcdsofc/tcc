import { ForbiddenException } from '@nestjs/common';
import { AccessPolicy } from './auth.decorators';
import { AuthPrincipal } from './auth.types';

/** Falha fechada: rota protegida sem política explícita é negada. */
export function assertAccessPolicy(policy: AccessPolicy | undefined, principal: AuthPrincipal): void {
  const deny = () => { throw new ForbiddenException('Acesso não permitido.'); };
  if (!policy) return deny();

  switch (policy.kind) {
    case 'tenant':
      if (policy.roles.length === 0 || principal.scope !== 'tenant' || !principal.activeTenantId) return deny();
      if (!policy.roles.some((role) => principal.roles.includes(role))) return deny();
      return;
    case 'account':
      if (principal.scope !== 'account' && principal.scope !== 'tenant') return deny();
      return;
    case 'platform':
      if (principal.scope !== 'platform' || !principal.roles.includes('platform_admin')) return deny();
      return;
    default:
      return deny();
  }
}
