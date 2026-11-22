import { Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

/** Cada serviço recebe só a URL do próprio banco: nenhum serviço consulta o banco de outro. */
@Injectable()
export class Database implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) readonly pool: Pool) {}

  query<T extends Record<string, any> = any>(text: string, params: unknown[] = []) {
    return this.pool.query<T>(text, params);
  }

  /** Executa várias operações numa transação; desfaz tudo se algo falhar. */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }) },
    Database,
  ],
  exports: [Database],
})
export class DatabaseModule {}
