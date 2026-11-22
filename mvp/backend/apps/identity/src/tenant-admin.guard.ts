import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthPrincipal, Database, forbidden } from '../../../libs/common/src';

/**
 * Além do token, confere no banco se a pessoa continua administradora ativa desta oficina.
 * Assim, quem foi rebaixado ou desativado perde na hora o poder de mexer na equipe e nos convites,
 * sem esperar o token de 8 horas expirar.
 */
@Injectable()
export class TenantAdminGuard implements CanActivate {
  constructor(private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const principal = context.switchToHttp().getRequest<{ authPrincipal?: AuthPrincipal }>().authPrincipal;
    const found = await this.db.query(
      `select 1 from memberships m join tenants t on t.id=m.tenant_id
       where m.user_id::text=$1 and m.tenant_id::text=$2 and m.status='active' and t.status='active' and 'tenant_admin'=any(m.roles)`,
      [principal?.userId ?? '', principal?.activeTenantId ?? ''],
    );
    if (!found.rowCount) throw forbidden('Somente um administrador ativo desta oficina pode fazer isso.');
    return true;
  }
}
