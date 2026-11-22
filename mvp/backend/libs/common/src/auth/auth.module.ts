import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessPolicyGuard, AuthGuard } from './auth.guards';
import { TOKEN_ISSUER, TOKEN_TTL } from './auth.types';

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT_SECRET deve estar definido e ter pelo menos 32 caracteres.');
  }
  return secret;
}

/** Toda rota exige autenticação e política explícita, salvo @Public/@InternalEndpoint. */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { algorithm: 'HS256', issuer: TOKEN_ISSUER, expiresIn: TOKEN_TTL },
        verifyOptions: { algorithms: ['HS256'], issuer: TOKEN_ISSUER },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AccessPolicyGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
