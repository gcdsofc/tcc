import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata, UseGuards } from '@nestjs/common';
import { TenantRole } from './auth.types';
import { ServiceSecretGuard } from '../internal/service-secret.guard';

export const IS_PUBLIC_KEY = 'garageops:is-public';
export const ACCESS_POLICY_KEY = 'garageops:access-policy';

export type AccessPolicy =
  | { kind: 'tenant'; roles: TenantRole[] }
  | { kind: 'account' }
  | { kind: 'platform' };

/** Rota aberta (login, health, ativação de convite). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Rota de oficina: exige lista explícita de papéis; lista vazia nega. */
export const TenantEndpoint = (...roles: TenantRole[]) =>
  SetMetadata(ACCESS_POLICY_KEY, { kind: 'tenant', roles } satisfies AccessPolicy);

/** Rota da conta logada (com ou sem oficina ativa), por exemplo listar vínculos e aceitar convite. */
export const AccountEndpoint = () => SetMetadata(ACCESS_POLICY_KEY, { kind: 'account' } satisfies AccessPolicy);

/** Console da plataforma: só cadastro das oficinas e dados agregados, nunca conteúdo operacional. */
export const PlatformEndpoint = () => SetMetadata(ACCESS_POLICY_KEY, { kind: 'platform' } satisfies AccessPolicy);

/** Rota só para chamadas entre serviços dentro da rede Docker (o nginx também bloqueia /internal/). */
export const InternalEndpoint = () => applyDecorators(Public(), UseGuards(ServiceSecretGuard));

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<{ authPrincipal?: unknown }>().authPrincipal,
);
