import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { conflict, Database, InternalEndpoint, notFound, text } from '../../../libs/common/src';

/** Rotas usadas só por outros serviços (rede interna, com segredo; o nginx bloqueia /internal/). */
@Controller('internal')
export class InternalController {
  constructor(private readonly db: Database) {}

  /** Liga o perfil local à identidade que aceitou o convite. Nunca transfere um perfil já ligado a outra conta. */
  @Post('link-customer')
  @InternalEndpoint()
  @HttpCode(200)
  async link(@Body() body: Record<string, unknown>) {
    const tenantId = text(body?.tenantId, 64);
    const phone = text(body?.phone, 40);
    const identityUserId = text(body?.identityUserId, 64);
    const updated = await this.db.query(
      `update customer_profiles set identity_user_id=$1::uuid where tenant_id::text=$2 and phone=$3
       and (identity_user_id is null or identity_user_id=$1::uuid) returning id`,
      [identityUserId, tenantId, phone],
    );
    if (!updated.rowCount) {
      const exists = await this.db.query('select 1 from customer_profiles where tenant_id::text=$1 and phone=$2', [tenantId, phone]);
      if (exists.rowCount) throw conflict('Este perfil já está ligado a outra conta GarageOps.', 'PROFILE_ALREADY_LINKED');
      throw notFound('Perfil local não localizado.');
    }
    return { linked: true, profileId: updated.rows[0].id };
  }

  /** Nome e e-mail cadastrados pela oficina, mostrados na ativação do convite depois do código. */
  @Get('profile')
  @InternalEndpoint()
  async profile(@Query('tenantId') tenantId: string, @Query('phone') phone: string) {
    const found = await this.db.query('select name,email from customer_profiles where tenant_id::text=$1 and phone=$2', [String(tenantId ?? ''), String(phone ?? '')]);
    if (!found.rowCount) throw notFound('Perfil local não localizado.');
    return found.rows[0];
  }

  /** Confirma que cliente e veículo existem na mesma oficina antes de abrir uma ordem. */
  @Get('validate/:customerId/:vehicleId')
  @InternalEndpoint()
  async validate(@Param('customerId') customerId: string, @Param('vehicleId') vehicleId: string, @Headers('x-tenant-id') tenantId: string) {
    const found = await this.db.query(
      `select c.id customer_id,c.identity_user_id,v.id vehicle_id from customer_profiles c join vehicles v on v.customer_id=c.id and v.tenant_id=c.tenant_id
       where c.id::text=$1 and v.id::text=$2 and c.tenant_id::text=$3`,
      [customerId, vehicleId, String(tenantId ?? '')],
    );
    if (!found.rowCount) throw notFound('Cliente ou veículo não localizado.');
    const row = found.rows[0];
    return { customerId: row.customer_id, vehicleId: row.vehicle_id, identityUserId: row.identity_user_id };
  }

  /** Exclusão pedida pelo console da plataforma: apaga os dados da oficina sem devolvê-los. */
  @Delete('tenants/:id')
  @InternalEndpoint()
  @HttpCode(204)
  async purge(@Param('id') id: string) {
    await this.db.transaction(async (client) => {
      await client.query('delete from vehicles where tenant_id::text=$1', [id]);
      await client.query('delete from customer_profiles where tenant_id::text=$1', [id]);
    });
  }
}
