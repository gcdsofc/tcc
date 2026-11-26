import { Body, CanActivate, Controller, Delete, ExecutionContext, Get, HttpCode, Injectable, Param, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  AuthPrincipal, badGateway, badRequest, BusinessException, callService, conflict, Database, forbidden, normalizePhone, notFound, PlatformEndpoint, text,
} from '../../../libs/common/src';

/** Além do token, confere no banco se a conta continua sendo administradora da plataforma. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly db: Database) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const principal = context.switchToHttp().getRequest<{ authPrincipal?: AuthPrincipal }>().authPrincipal;
    const found = await this.db.query(`select 1 from users where id::text=$1 and status='active' and platform_role='platform_admin'`, [principal?.userId ?? '']);
    if (!found.rowCount) throw forbidden('Área restrita ao administrador da plataforma.');
    return true;
  }
}

export const slugify = (value: unknown) => String(value ?? '').trim().toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
export const validColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? ''));

// Só cadastro da oficina e contagens de contas: nenhuma consulta a clientes, veículos, ordens ou pagamentos.
const TENANT_SELECT = `select t.id,t.name,t.slug,t.brand_color,t.status,t.created_at,
  count(m.id) filter (where m.status='active' and not ('customer'=any(m.roles)))::int as team_accounts,
  count(m.id) filter (where m.status='active' and 'customer'=any(m.roles))::int as customer_accounts
  from tenants t left join memberships m on m.tenant_id=t.id`;

/**
 * Console da plataforma GarageOps: cadastra, edita, suspende e exclui oficinas.
 * O administrador conhece o cadastro (nome, identificador, cor, situação), nunca o conteúdo operacional.
 */
@Controller('platform/tenants')
@PlatformEndpoint()
@UseGuards(PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly db: Database) {}

  @Get()
  async list() {
    return (await this.db.query(`${TENANT_SELECT} group by t.id order by t.created_at,t.name`)).rows;
  }

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    const name = text(body?.name, 80);
    const slug = slugify(body?.slug || body?.name);
    const color = validColor(body?.brandColor) ? String(body.brandColor) : '#0f766e';
    const ownerName = text(body?.ownerName, 80);
    const email = text(body?.ownerEmail, 200).toLowerCase();
    const phone = normalizePhone(text(body?.ownerPhone, 40));
    const password = String(body?.ownerPassword ?? '');
    if (!name || !slug || !ownerName || !email || !phone) throw badRequest('Informe nome da oficina, identificador e os dados do administrador da oficina.');

    let reused = false;
    let tenantId: string;
    try {
      tenantId = await this.db.transaction(async (client) => {
        const id = randomUUID();
        await client.query('insert into tenants(id,name,slug,brand_color) values($1,$2,$3,$4)', [id, name, slug, color]);
        // Conta global: se o e-mail já tem conta GarageOps, só cria o vínculo de administrador.
        const existing = await client.query('select id,platform_role from users where lower(email)=lower($1)', [email]);
        let userId: string;
        if (existing.rowCount) {
          if (existing.rows[0].platform_role) throw badRequest('A conta da plataforma não pode administrar oficinas.');
          userId = existing.rows[0].id;
          reused = true;
        } else {
          if (password.length < 12) throw badRequest('Defina uma senha inicial com pelo menos 12 caracteres para o novo administrador.');
          userId = randomUUID();
          await client.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5)', [userId, ownerName, email, phone, await bcrypt.hash(password, 12)]);
        }
        await client.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)', [randomUUID(), userId, id, ['tenant_admin']]);
        return id;
      });
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      if ((error as { code?: string }).code === '23505') throw conflict('Identificador já utilizado por outra oficina.', 'SLUG_TAKEN');
      throw conflict('Não foi possível cadastrar a oficina.');
    }
    const created = await this.db.query(`${TENANT_SELECT} where t.id=$1 group by t.id`, [tenantId]);
    return { ...created.rows[0], ownerAccount: reused ? 'existing' : 'created' };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const current = await this.db.query('select * from tenants where id::text=$1', [id]);
    if (!current.rowCount) throw notFound('Oficina não encontrada.');
    const tenant = current.rows[0];
    const name = body?.name !== undefined ? text(body.name, 80) : tenant.name;
    const slug = body?.slug !== undefined ? slugify(body.slug) : tenant.slug;
    const color = body?.brandColor !== undefined ? body.brandColor : tenant.brand_color;
    const status = body?.status !== undefined ? body.status : tenant.status;
    if (!name || !slug) throw badRequest('Nome e identificador são obrigatórios.');
    if (!validColor(color)) throw badRequest('Cor inválida. Use o formato #RRGGBB.');
    if (status !== 'active' && status !== 'suspended') throw badRequest('Status inválido.');
    try {
      await this.db.query('update tenants set name=$2,slug=$3,brand_color=$4,status=$5 where id=$1', [tenant.id, name, slug, color, status]);
    } catch (error) {
      throw conflict((error as { code?: string }).code === '23505' ? 'Identificador já utilizado por outra oficina.' : 'Não foi possível salvar.');
    }
    return (await this.db.query(`${TENANT_SELECT} where t.id=$1 group by t.id`, [tenant.id])).rows[0];
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const current = await this.db.query('select id,slug from tenants where id::text=$1', [id]);
    if (!current.rowCount) throw notFound('Oficina não encontrada.');
    const tenant = current.rows[0];
    if (text(body?.confirmSlug, 80) !== tenant.slug) throw badRequest('Digite o identificador da oficina para confirmar a exclusão.');
    // Cada serviço apaga os dados do próprio banco; a identidade nunca lê esses dados.
    for (const base of [process.env.WORKORDERS_URL, process.env.CUSTOMER_URL]) {
      const purged = await callService(base, `/internal/tenants/${tenant.id}`, { method: 'DELETE' });
      if (!purged.ok) throw badGateway('Não foi possível remover os dados operacionais da oficina. Nada foi excluído da identidade; tente novamente.');
    }
    await this.db.transaction(async (client) => {
      await client.query('delete from invitations where tenant_id=$1', [tenant.id]);
      await client.query('delete from memberships where tenant_id=$1', [tenant.id]);
      await client.query('delete from tenants where id=$1', [tenant.id]);
    });
  }
}
