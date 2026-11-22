import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Database } from '../../../libs/common/src';

const demoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const orderId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** [ordem, oficina, perfil do cliente, veículo, identidade do cliente, problema, status] */
const DEMO_ORDERS: [number, number, number, number, number, string, string][] = [
  [1, 1, 601, 701, 301, 'Problema no sistema de freios', 'awaiting_approval'],
  [2, 3, 602, 703, 301, 'Revisão preventiva', 'in_progress'],
  [3, 2, 603, 705, 303, 'Ruído na suspensão dianteira', 'open'],
  [4, 4, 614, 709, 302, 'Ar-condicionado sem refrigeração', 'open'],
  [5, 5, 615, 710, 302, 'Luz de injeção acesa', 'open'],
  [6, 2, 604, 750, 301, 'Vibração ao frear em baixa velocidade', 'awaiting_approval'],
];

/** Esquema do serviço de ordens. Idempotente: serve para banco novo e para o banco do MVP anterior. */
@Injectable()
export class WorkordersSchema implements OnModuleInit {
  private readonly logger = new Logger(WorkordersSchema.name);
  constructor(private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS orders(id uuid primary key,tenant_id uuid not null,customer_id uuid not null,vehicle_id uuid not null,customer_identity_id uuid,created_by uuid not null,problem text not null,status text not null default 'open',diagnosis text,closed_reason text,opened_at timestamptz default now(),updated_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS estimates(id uuid primary key,tenant_id uuid not null,order_id uuid not null references orders(id),version int not null,status text not null,total numeric(12,2) not null,created_by uuid not null,created_at timestamptz default now(),unique(order_id,version));
      CREATE TABLE IF NOT EXISTS estimate_items(id uuid primary key,estimate_id uuid not null references estimates(id) on delete cascade,kind text not null check(kind in('service','part')),description text not null,quantity numeric(10,2) not null,unit_price numeric(12,2) not null);
      CREATE TABLE IF NOT EXISTS decisions(id uuid primary key,tenant_id uuid not null,estimate_id uuid not null references estimates(id),user_id uuid not null,decision text not null check(decision in('approved','refused')),reason text,decided_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS messages(id uuid primary key,tenant_id uuid not null,order_id uuid not null references orders(id),user_id uuid not null,sender_name text not null,sender_type text not null,body text not null,created_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS executions(id uuid primary key,tenant_id uuid not null,order_id uuid not null references orders(id),estimate_item_id uuid references estimate_items(id),description text not null,performed_by uuid not null,performed_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS payments(id uuid primary key,tenant_id uuid not null,order_id uuid not null references orders(id),amount numeric(12,2) not null,method text not null,recorded_by uuid not null,created_at timestamptz default now());
      CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id, opened_at desc);
    `);
    if (process.env.BOOTSTRAP_DEMO === 'true') await this.seedDemo();
  }

  private async seedDemo(): Promise<void> {
    const existing = await this.db.query<{ n: number }>('select count(*)::int n from orders');
    if (existing.rows[0].n > 0) return;
    this.logger.log('Carregando dados de demonstração');
    const admin = demoId(100);
    const mechanic = demoId(101);
    for (const [order, tenant, customer, vehicle, identity, problem, status] of DEMO_ORDERS) {
      const id = orderId(order);
      const tenantId = demoId(tenant);
      await this.db.query(
        'insert into orders(id,tenant_id,customer_id,vehicle_id,customer_identity_id,created_by,problem,status) values($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, tenantId, demoId(customer), demoId(vehicle), demoId(identity), admin, problem, status],
      );
      if (!['awaiting_approval', 'in_progress'].includes(status)) continue;
      const estimate = await this.db.query(
        'insert into estimates(id,tenant_id,order_id,version,status,total,created_by) values(gen_random_uuid(),$1,$2,1,$3,850,$4) returning id',
        [tenantId, id, status === 'in_progress' ? 'approved' : 'pending', mechanic],
      );
      const service = await this.db.query(
        `insert into estimate_items(id,estimate_id,kind,description,quantity,unit_price) values(gen_random_uuid(),$1,'service','Revisão do sistema de freios',2,250) returning id`,
        [estimate.rows[0].id],
      );
      await this.db.query(
        `insert into estimate_items(id,estimate_id,kind,description,quantity,unit_price) values(gen_random_uuid(),$1,'part','Pastilhas de freio (informada manualmente)',1,350)`,
        [estimate.rows[0].id],
      );
      if (status === 'in_progress') {
        await this.db.query(
          `insert into executions(id,tenant_id,order_id,estimate_item_id,description,performed_by) values(gen_random_uuid(),$1,$2,$3,'Revisão do sistema de freios',$4)`,
          [tenantId, id, service.rows[0].id, mechanic],
        );
      }
    }
  }
}
