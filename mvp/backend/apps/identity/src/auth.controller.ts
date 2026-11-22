import { Body, Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  AccountEndpoint, AuthPrincipal, BusinessException, CurrentPrincipal, Database, forbidden, Public, TenantRole, text, tooMany, unavailable,
} from '../../../libs/common/src';
import { TokensService } from './tokens.service';

const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;
const OFFICES_SQL = `select t.id,t.id as tenant_id,t.name,t.slug,t.brand_color,m.roles
  from memberships m join tenants t on t.id=m.tenant_id
  where m.user_id=$1 and m.status='active' and t.status='active' order by t.name`;

@Controller()
export class AuthController {
  /** Tentativas por IP + e-mail, em memória (suficiente para um serviço único no MVP). */
  private readonly attempts = new Map<string, { count: number; until: number }>();

  constructor(private readonly db: Database, private readonly tokens: TokensService) {}

  @Get('health')
  @Public()
  async health() {
    try { await this.db.query('select 1'); } catch { throw unavailable('Banco de dados indisponível.'); }
    return { service: 'identity', status: 'ok' };
  }

  @Post('auth/login')
  @Public()
  @HttpCode(200)
  async login(@Body() body: Record<string, unknown>, @Ip() ip: string) {
    const email = text(body?.email, 200).toLowerCase();
    const password = String(body?.password ?? '');
    const key = `${ip}:${email}`;
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (entry && entry.until > now && entry.count >= MAX_ATTEMPTS) throw tooMany('Muitas tentativas. Aguarde 15 minutos.');
    if (entry && entry.until <= now) this.attempts.delete(key);

    const found = await this.db.query('select id,name,email,password_hash,status,platform_role from users where lower(email)=lower($1)', [email]);
    const user = found.rows[0];
    if (!user || user.status !== 'active' || !(await bcrypt.compare(password, user.password_hash))) {
      const current = this.attempts.get(key) ?? { count: 0, until: now + LOCK_MS };
      current.count++;
      current.until = now + LOCK_MS;
      this.attempts.set(key, current);
      throw new BusinessException('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 401);
    }
    this.attempts.delete(key);
    const ref = { id: user.id, name: user.name, email: user.email };
    if (user.platform_role === 'platform_admin') return { token: this.tokens.platform(ref), user: ref, platform: true, offices: [] };
    const offices = await this.db.query(OFFICES_SQL, [user.id]);
    return { token: this.tokens.account(ref), user: ref, offices: offices.rows };
  }

  @Get('auth/me')
  @AccountEndpoint()
  me(@CurrentPrincipal() principal: AuthPrincipal) {
    return {
      user: { id: principal.userId, name: principal.name, email: principal.email },
      tenantId: principal.activeTenantId ?? null,
      roles: principal.roles,
    };
  }

  @Post('auth/select-office')
  @AccountEndpoint()
  @HttpCode(200)
  async selectOffice(@CurrentPrincipal() principal: AuthPrincipal, @Body() body: Record<string, unknown>) {
    const found = await this.db.query(
      `select m.roles,t.id,t.name,t.slug,t.brand_color from memberships m join tenants t on t.id=m.tenant_id
       where m.user_id=$1 and m.tenant_id::text=$2 and m.status='active' and t.status='active'`,
      [principal.userId, text(body?.tenantId, 64)],
    );
    if (!found.rowCount) throw forbidden('Você não possui vínculo ativo com esta oficina.');
    const office = found.rows[0];
    const token = this.tokens.tenant({ id: principal.userId, name: principal.name, email: principal.email }, { id: office.id, name: office.name, roles: office.roles as TenantRole[] });
    return { token, office };
  }

  @Get('tenants')
  @AccountEndpoint()
  async myOffices(@CurrentPrincipal() principal: AuthPrincipal) {
    return (await this.db.query(OFFICES_SQL, [principal.userId])).rows;
  }
}
