import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ACCESS_POLICY_KEY, AccessPolicy, IS_PUBLIC_KEY } from './auth.decorators';
import { assertAccessPolicy } from './access-policy';
import { principalFromVerifiedClaims } from './auth-context';
import { AuthPrincipal, JwtClaims, TOKEN_ISSUER } from './auth.types';

type AuthRequest = { headers: { authorization?: string }; authPrincipal?: AuthPrincipal };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const match = request.headers.authorization?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Autenticação necessária.');
    try {
      const claims = await this.jwt.verifyAsync<JwtClaims>(match[1], { algorithms: ['HS256'], issuer: TOKEN_ISSUER });
      request.authPrincipal = principalFromVerifiedClaims(claims);
      return true;
    } catch {
      // Não expõe detalhes de leitura/verificação do token.
      throw new UnauthorizedException('Sua sessão expirou ou é inválida. Entre novamente.');
    }
  }
}

@Injectable()
export class AccessPolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const policy = this.reflector.getAllAndOverride<AccessPolicy>(ACCESS_POLICY_KEY, [context.getHandler(), context.getClass()]);
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.authPrincipal) return false;
    assertAccessPolicy(policy, request.authPrincipal);
    return true;
  }
}
