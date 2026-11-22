import { Controller, Delete, HttpCode, Param } from '@nestjs/common';
import { Database, InternalEndpoint } from '../../../libs/common/src';

/** Rotas usadas só por outros serviços (rede interna, com segredo; o nginx bloqueia /internal/). */
@Controller('internal')
export class InternalController {
  constructor(private readonly db: Database) {}

  /** Exclusão pedida pelo console da plataforma: apaga os dados da oficina sem devolvê-los. */
  @Delete('tenants/:id')
  @InternalEndpoint()
  @HttpCode(204)
  async purge(@Param('id') id: string) {
    await this.db.transaction(async (client) => {
      for (const table of ['payments', 'executions', 'messages', 'decisions', 'estimates', 'orders']) {
        await client.query(`delete from ${table} where tenant_id::text=$1`, [id]);
      }
    });
  }
}
