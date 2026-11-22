import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantRole } from '../../../libs/common/src';

export interface UserRef { id: string; name: string; email: string }

/** Único emissor de tokens do sistema; os outros serviços só verificam. */
@Injectable()
export class TokensService {
  constructor(private readonly jwt: JwtService) {}

  account(user: UserRef): string {
    return this.jwt.sign({ sub: user.id, name: user.name, email: user.email, scope: 'account' });
  }

  tenant(user: UserRef, office: { id: string; name: string; roles: TenantRole[] }): string {
    return this.jwt.sign({ sub: user.id, name: user.name, email: user.email, scope: 'tenant', activeTenantId: office.id, tenantName: office.name, roles: office.roles });
  }

  platform(user: UserRef): string {
    return this.jwt.sign({ sub: user.id, name: user.name, email: user.email, scope: 'platform', roles: ['platform_admin'] });
  }
}
