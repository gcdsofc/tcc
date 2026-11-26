import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import {
  AccountEndpoint, AuthPrincipal, badRequest, BusinessException, callService, conflict, CurrentPrincipal, Database, forbidden,
  normalizePhone, notFound, Public, TenantEndpoint, TenantPrincipal, text,
} from '../../../libs/common/src';
import { TenantAdminGuard } from './tenant-admin.guard';
import { TokensService } from './tokens.service';

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const EXISTING_ACCOUNT = 'Este telefone já tem uma conta GarageOps. Clique em "Já tenho conta", entre com ela e confirme o convite com o mesmo código.';

interface Invitation { id: string; tenant_id: string; phone: string; code_hash: string }

/**
 * Convite de cliente para o portal.
 * O link sozinho não mostra dados nem autentica: primeiro a pessoa confirma o código;
 * só então vê o nome e o e-mail cadastrados pela oficina, que não podem ser trocados na ativação.
 * Um telefone com conta existente aceita o convite entrando com essa conta (nunca cria outra).
 */
@Controller('invites')
export class InvitesController {
  constructor(private readonly db: Database, private readonly tokens: TokensService) {}

  @Post()
  @TenantEndpoint('tenant_admin')
  @UseGuards(TenantAdminGuard)
  async create(@CurrentPrincipal() principal: TenantPrincipal, @Body() body: Record<string, unknown>) {
    const phone = normalizePhone(text(body?.phone, 40));
    const customerName = text(body?.customerName, 160);
    if (!phone || !customerName) throw badRequest('Nome e telefone são obrigatórios.');
    const hasAccess = await this.db.query(
      `select 1 from users u join memberships m on m.user_id=u.id where u.phone=$1 and m.tenant_id=$2 and m.status='active' and 'customer'=any(m.roles)`,
      [phone, principal.activeTenantId],
    );
    if (hasAccess.rowCount) throw conflict('Este cliente já tem acesso ao portal desta oficina. Não é preciso enviar outro convite.', 'ALREADY_HAS_ACCESS');
    const id = randomUUID();
    const token = randomBytes(32).toString('hex');
    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.db.query(
      'insert into invitations(id,tenant_id,phone,customer_name,token_hash,code_hash,expires_at,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, principal.activeTenantId, phone, customerName, sha256(token), await bcrypt.hash(code, 10), expiresAt, principal.userId],
    );
    // Envio real (SMS/WhatsApp) fica para depois; na demonstração local o código volta na resposta.
    return {
      inviteId: id,
      activationUrl: `/ativar?token=${token}`,
      expiresAt,
      delivery: 'mock-local',
      ...(process.env.BOOTSTRAP_DEMO === 'true' ? { devCode: code } : {}),
    };
  }

  @Post('verify')
  @Public()
  @HttpCode(200)
  async verify(@Body() body: Record<string, unknown>) {
    const invitation = await this.checkCode(body?.token, body?.code);
    if (await this.phoneHasAccount(invitation.phone)) throw conflict(EXISTING_ACCOUNT, 'EXISTING_ACCOUNT');
    const profile = await this.invitedProfile(invitation);
    return { name: profile.name, email: profile.email || null };
  }

  @Post('activate')
  @Public()
  async activate(@Body() body: Record<string, unknown>) {
    const password = String(body?.password ?? '');
    if (password.length < 12) throw badRequest('A senha precisa ter pelo menos 12 caracteres.');
    const invitation = await this.checkCode(body?.token, body?.code);
    if (await this.phoneHasAccount(invitation.phone)) throw conflict(EXISTING_ACCOUNT, 'EXISTING_ACCOUNT');
    const profile = await this.invitedProfile(invitation);
    const name = profile.name;
    const email = (profile.email || text(body?.email, 200)).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Informe um e-mail válido para a sua conta.');

    const userId = randomUUID();
    const hash = await bcrypt.hash(password, 12);
    try {
      await this.db.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)', [userId, name, email, normalizePhone(invitation.phone), hash]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw conflict('Este e-mail já é usado por outra conta GarageOps. Peça à oficina para corrigir o e-mail do cadastro ou entre com a conta existente.', 'EMAIL_TAKEN');
      }
      throw error;
    }
    const linked = await this.linkProfile(invitation, userId);
    if (!linked.ok) {
      await this.db.query('delete from users where id=$1', [userId]);
      throw conflict('Não foi possível associar o perfil de cliente desta oficina.', 'LINK_FAILED');
    }
    await this.db.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)', [randomUUID(), userId, invitation.tenant_id, ['customer']]);
    await this.db.query('update invitations set used_at=now() where id=$1', [invitation.id]);
    const user = { id: userId, name, email };
    return { token: this.tokens.account(user), user };
  }

  @Post('accept')
  @AccountEndpoint()
  @HttpCode(200)
  async accept(@CurrentPrincipal() principal: AuthPrincipal, @Body() body: Record<string, unknown>) {
    const invitation = await this.checkCode(body?.token, body?.code);
    const account = await this.db.query('select phone from users where id=$1', [principal.userId]);
    if (normalizePhone(account.rows[0]?.phone) !== normalizePhone(invitation.phone)) throw forbidden('A conta autenticada não corresponde ao telefone convidado.', 'PHONE_MISMATCH');
    // Quem foi desativado da equipe perde o acesso na hora; o convite de cliente não pode reativá-lo.
    const current = await this.db.query('select roles,status from memberships where user_id=$1 and tenant_id=$2', [principal.userId, invitation.tenant_id]);
    const member = current.rows[0];
    if (member && member.status !== 'active' && (member.roles as string[]).some((role) => role !== 'customer')) {
      throw conflict('Seu acesso a esta oficina está desativado. Fale com o administrador da oficina.', 'MEMBERSHIP_INACTIVE');
    }
    const linked = await this.linkProfile(invitation, principal.userId);
    if (!linked.ok) throw conflict('Não foi possível associar o perfil de cliente desta oficina.', 'LINK_FAILED');
    await this.db.query(
      `insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)
       on conflict(user_id,tenant_id) do update set status='active',
       roles=(select array_agg(distinct role) from unnest(memberships.roles||excluded.roles) as r(role))`,
      [randomUUID(), principal.userId, invitation.tenant_id, ['customer']],
    );
    await this.db.query('update invitations set used_at=now() where id=$1', [invitation.id]);
    return { accepted: true, tenantId: invitation.tenant_id };
  }

  @Post(':id/revoke')
  @TenantEndpoint('tenant_admin')
  @UseGuards(TenantAdminGuard)
  @HttpCode(200)
  async revoke(@CurrentPrincipal() principal: TenantPrincipal, @Param('id') id: string) {
    const updated = await this.db.query(
      'update invitations set revoked_at=now() where id::text=$1 and tenant_id=$2 and used_at is null returning id',
      [id, principal.activeTenantId],
    );
    if (!updated.rowCount) throw notFound('Convite não encontrado ou já utilizado.');
    return { revoked: true };
  }

  /** Valida link + código; código errado conta tentativa e o 5º erro cancela o convite. */
  private async checkCode(token: unknown, code: unknown): Promise<Invitation> {
    const found = await this.db.query<Invitation>(
      `select * from invitations where token_hash=$1 and used_at is null and revoked_at is null and expires_at>now() and attempts<${MAX_CODE_ATTEMPTS}`,
      [sha256(String(token ?? ''))],
    );
    const invitation = found.rows[0];
    if (!invitation) throw badRequest('Convite inválido, expirado ou já utilizado.', 'INVALID_INVITE');
    if (!(await bcrypt.compare(String(code ?? ''), invitation.code_hash))) {
      await this.db.query(
        `update invitations set attempts=attempts+1, revoked_at=case when attempts>=${MAX_CODE_ATTEMPTS - 1} then now() else revoked_at end where id=$1`,
        [invitation.id],
      );
      throw badRequest('Código inválido.', 'INVALID_CODE');
    }
    return invitation;
  }

  private async phoneHasAccount(phone: string): Promise<boolean> {
    return ((await this.db.query('select 1 from users where phone=$1', [normalizePhone(phone)])).rowCount ?? 0) > 0;
  }

  private async invitedProfile(invitation: Invitation): Promise<{ name: string; email: string | null }> {
    const response = await callService<{ name: string; email: string | null }>(
      process.env.CUSTOMER_URL,
      `/internal/profile?tenantId=${encodeURIComponent(invitation.tenant_id)}&phone=${encodeURIComponent(normalizePhone(invitation.phone))}`,
    );
    if (!response.ok || !response.data) {
      throw new BusinessException('PROFILE_NOT_FOUND', 'O cadastro deste cliente não foi encontrado na oficina. Peça um novo convite.');
    }
    return response.data;
  }

  private linkProfile(invitation: Invitation, identityUserId: string) {
    return callService(process.env.CUSTOMER_URL, '/internal/link-customer', {
      method: 'POST',
      body: { tenantId: invitation.tenant_id, phone: normalizePhone(invitation.phone), identityUserId },
    });
  }
}
