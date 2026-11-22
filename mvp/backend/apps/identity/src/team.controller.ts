import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  badRequest, BusinessException, conflict, CurrentPrincipal, Database, forbidden, notFound, TenantEndpoint, TenantPrincipal, text,
} from '../../../libs/common/src';
import { TenantAdminGuard } from './tenant-admin.guard';
import { isStaffRole, nextRoles, rejectMemberChange } from './team.rules';

// Equipe = vínculos da oficina ativa que têm algum papel de equipe (clientes ficam no convite).
const TEAM_SELECT = `select m.id,m.user_id,u.name,u.email,u.phone,m.roles,m.status
  from memberships m join users u on u.id=m.user_id
  where m.tenant_id=$1 and m.roles && array['tenant_admin','attendant','mechanic','finance']::text[]`;

/**
 * Gestão da equipe pelo administrador da oficina (RF-005): cadastrar, listar, trocar papel e
 * desativar/reativar vínculos, sempre só na oficina ativa. Remover um vínculo não apaga a conta global.
 */
@Controller('team')
@TenantEndpoint('tenant_admin')
@UseGuards(TenantAdminGuard)
export class TeamController {
  constructor(private readonly db: Database) {}

  @Get()
  async list(@CurrentPrincipal() p: TenantPrincipal) {
    return (await this.db.query(`${TEAM_SELECT} order by m.status, u.name`, [p.activeTenantId])).rows;
  }

  @Post()
  async add(@CurrentPrincipal() p: TenantPrincipal, @Body() body: Record<string, unknown>) {
    const name = text(body?.name, 80);
    const email = text(body?.email, 200).toLowerCase();
    const phone = text(body?.phone, 40);
    const role = body?.role;
    const password = String(body?.password ?? '');
    if (!name || !email || !phone) throw badRequest('Informe nome, e-mail e telefone.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Informe um e-mail válido.');
    if (!isStaffRole(role)) throw badRequest('Escolha o papel: administrador, atendente, mecânico ou financeiro.');

    let reused = false;
    const membershipId = await this.db.transaction(async (client) => {
      // Conta global: se o e-mail já tem conta GarageOps, só cria o vínculo com esta oficina.
      const existing = await client.query('select id,platform_role from users where lower(email)=lower($1)', [email]);
      let userId: string;
      if (existing.rowCount) {
        if (existing.rows[0].platform_role) throw badRequest('A conta da plataforma não pode fazer parte da equipe de uma oficina.');
        userId = existing.rows[0].id;
        reused = true;
        const already = await client.query('select roles from memberships where user_id=$1 and tenant_id=$2', [userId, p.activeTenantId]);
        if (already.rowCount) {
          const asCustomer = (already.rows[0].roles as string[]).every((r) => r === 'customer');
          throw conflict(asCustomer
            ? 'Esta pessoa já é cliente desta oficina. Use outro e-mail para o acesso de equipe.'
            : 'Esta pessoa já faz parte da equipe desta oficina.', 'ALREADY_MEMBER');
        }
      } else {
        if (password.length < 12) throw badRequest('Defina uma senha inicial com pelo menos 12 caracteres.');
        userId = randomUUID();
        await client.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)', [userId, name, email, phone, await bcrypt.hash(password, 12)]);
      }
      const id = randomUUID();
      await client.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)', [id, userId, p.activeTenantId, [role]]);
      return id;
    }).catch((error) => {
      if (error instanceof BusinessException) throw error;
      throw conflict('Não foi possível cadastrar o membro da equipe.');
    });
    const created = await this.db.query(`${TEAM_SELECT} and m.id=$2`, [p.activeTenantId, membershipId]);
    return { ...created.rows[0], account: reused ? 'existing' : 'created' };
  }

  @Patch(':id')
  async update(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const found = await this.db.query('select id,user_id,roles,status from memberships where id::text=$1 and tenant_id=$2', [id, p.activeTenantId]);
    if (!found.rowCount) throw notFound('Membro não encontrado nesta oficina.');
    const member = found.rows[0];
    const admins = await this.db.query<{ n: number }>(
      `select count(*)::int n from memberships where tenant_id=$1 and status='active' and 'tenant_admin'=any(roles)`, [p.activeTenantId],
    );
    const nextRole = body?.role === undefined ? undefined : String(body.role);
    const nextStatus = body?.status === undefined ? undefined : String(body.status);
    const reason = rejectMemberChange({
      actorUserId: p.userId, targetUserId: member.user_id, currentRoles: member.roles, currentStatus: member.status,
      nextRole, nextStatus, activeAdmins: admins.rows[0].n,
    });
    if (reason) throw (reason.startsWith('Você não pode') ? forbidden(reason) : badRequest(reason));
    const roles = nextRole && isStaffRole(nextRole) ? nextRoles(member.roles, nextRole) : member.roles;
    await this.db.query('update memberships set roles=$2,status=$3 where id=$1', [member.id, roles, nextStatus ?? member.status]);
    return (await this.db.query(`${TEAM_SELECT} and m.id=$2`, [p.activeTenantId, member.id])).rows[0];
  }
}
