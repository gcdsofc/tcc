import { Controller, Get, Param } from '@nestjs/common';
import { Database, InternalEndpoint, notFound } from '../../../libs/common/src';

/** Consulta mínima para outros serviços (rede interna, com segredo). */
@Controller('internal')
export class InternalController {
  constructor(private readonly db: Database) {}

  @Get('tenant/:id')
  @InternalEndpoint()
  async tenant(@Param('id') id: string) {
    const found = await this.db.query('select id,name,slug from tenants where id::text=$1', [id]);
    if (!found.rowCount) throw notFound('Oficina não encontrada.');
    return found.rows[0];
  }
}
