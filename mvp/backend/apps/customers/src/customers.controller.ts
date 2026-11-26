import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  badRequest, conflict, CurrentPrincipal, Database, forbidden, isUuid, normalizePhone, notFound, optionalText, Public, TenantEndpoint, TenantPrincipal, text, unavailable,
} from '../../../libs/common/src';
import { canReadProfile, normalizeCep, normalizeFipeCode } from './domain';

const PROFILE_FIELDS = 'id,name,email,phone,cep,street,address_number,district,city,state';
const VEHICLE_SELECT = `select v.*,c.name customer_name from vehicles v join customer_profiles c on c.id=v.customer_id and c.tenant_id=v.tenant_id`;

/** Clientes e veículos da oficina ativa. Toda consulta é filtrada pelo tenant do token. */
@Controller()
export class CustomersController {
  constructor(private readonly db: Database) {}

  @Get('health')
  @Public()
  async health() {
    try { await this.db.query('select 1'); } catch { throw unavailable('Banco de dados indisponível.'); }
    return { service: 'customers', status: 'ok' };
  }

  @Get('customers')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic', 'customer')
  async listCustomers(@CurrentPrincipal() p: TenantPrincipal) {
    const result = p.roles.includes('customer')
      ? await this.db.query(`select ${PROFILE_FIELDS} from customer_profiles where tenant_id=$1 and identity_user_id=$2 order by name`, [p.activeTenantId, p.userId])
      : await this.db.query(`select ${PROFILE_FIELDS} from customer_profiles where tenant_id=$1 order by name`, [p.activeTenantId]);
    return result.rows;
  }

  @Post('customers')
  @TenantEndpoint('tenant_admin', 'attendant')
  async createCustomer(@CurrentPrincipal() p: TenantPrincipal, @Body() body: Record<string, unknown>) {
    const name = text(body?.name, 160);
    const phone = normalizePhone(text(body?.phone, 40));
    const email = text(body?.email, 200).toLowerCase() || null;
    if (!name || !phone) throw badRequest('Nome e telefone são obrigatórios.');
    let cep: string | null;
    try { cep = normalizeCep(body?.cep); } catch (error) { throw badRequest((error as Error).message); }
    const state = optionalText(body?.state, 2)?.toUpperCase() ?? null;
    try {
      const created = await this.db.query(
        `insert into customer_profiles(id,tenant_id,name,email,phone,cep,street,address_number,district,city,state)
         values(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning ${PROFILE_FIELDS}`,
        [p.activeTenantId, name, email, phone, cep, optionalText(body?.street, 160), optionalText(body?.addressNumber, 20), optionalText(body?.district, 80), optionalText(body?.city, 80), state],
      );
      return created.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw conflict('Já existe um cliente com esse telefone nesta oficina.', 'CUSTOMER_PHONE_TAKEN');
      throw error;
    }
  }

  @Get('customers/:id')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic', 'customer')
  async getCustomer(@CurrentPrincipal() p: TenantPrincipal, @Param('id') id: string) {
    const found = await this.db.query('select id,name,email,phone,identity_user_id from customer_profiles where id::text=$1 and tenant_id=$2', [id, p.activeTenantId]);
    if (!found.rowCount) throw notFound('Cliente não encontrado.');
    if (!canReadProfile(p.roles, p.userId, found.rows[0].identity_user_id)) throw forbidden('Acesso negado.');
    return found.rows[0];
  }

  @Get('vehicles')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic', 'customer')
  async listVehicles(@CurrentPrincipal() p: TenantPrincipal) {
    const result = p.roles.includes('customer')
      ? await this.db.query(`${VEHICLE_SELECT} where v.tenant_id=$1 and c.identity_user_id=$2 order by v.plate`, [p.activeTenantId, p.userId])
      : await this.db.query(`${VEHICLE_SELECT} where v.tenant_id=$1 order by v.plate`, [p.activeTenantId]);
    return result.rows;
  }

  @Post('vehicles')
  @TenantEndpoint('tenant_admin', 'attendant')
  async createVehicle(@CurrentPrincipal() p: TenantPrincipal, @Body() body: Record<string, unknown>) {
    const customerId = body?.customerId;
    const plate = text(body?.plate, 8);
    if (!customerId || !plate) throw badRequest('Cliente e placa são obrigatórios.');
    const owner = isUuid(customerId)
      ? await this.db.query('select id from customer_profiles where id=$1 and tenant_id=$2', [customerId, p.activeTenantId])
      : { rowCount: 0 };
    if (!owner.rowCount) throw notFound('Cliente não encontrado nesta oficina.');
    const year = Number(body?.year) || null;
    try {
      const created = await this.db.query(
        'insert into vehicles(id,tenant_id,customer_id,plate,make,model,year,fipe_code) values(gen_random_uuid(),$1,$2,upper($3),$4,$5,$6,$7) returning *',
        [p.activeTenantId, customerId, plate, optionalText(body?.make, 60), optionalText(body?.model, 120), year, normalizeFipeCode(body?.fipeCode)],
      );
      return created.rows[0];
    } catch {
      throw conflict('Placa já cadastrada nesta oficina ou dados inválidos.', 'PLATE_TAKEN');
    }
  }

  @Get('lookup/:customerId/:vehicleId')
  @TenantEndpoint('tenant_admin', 'attendant', 'mechanic', 'customer')
  async lookup(@CurrentPrincipal() p: TenantPrincipal, @Param('customerId') customerId: string, @Param('vehicleId') vehicleId: string) {
    const found = await this.db.query(
      `select c.id customer_id,v.id vehicle_id from customer_profiles c join vehicles v on v.customer_id=c.id and v.tenant_id=c.tenant_id
       where c.id::text=$1 and v.id::text=$2 and c.tenant_id=$3`,
      [customerId, vehicleId, p.activeTenantId],
    );
    if (!found.rowCount) throw notFound('Cliente ou veículo não pertence a esta oficina.');
    return found.rows[0];
  }
}
