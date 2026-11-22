import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

export function serviceSecret(): string {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) throw new Error('SERVICE_SECRET deve estar definido.');
  return secret;
}

/** Protege rotas /internal/: só outros serviços, com o segredo compartilhado, podem chamar. */
@Injectable()
export class ServiceSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers['x-service-secret'];
    const expected = Buffer.from(serviceSecret());
    const received = Buffer.from(String(header ?? ''));
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new ForbiddenException('Acesso não permitido.');
    }
    return true;
  }
}
