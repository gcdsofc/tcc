import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Database } from '../../../libs/common/src';

const demoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** [id do perfil, oficina, identidade, nome, e-mail, telefone] */
type DemoCustomer = [number, number, number, string, string, string];
const CARS: [string, string, string, number][] = [
  ['ABC1A01', 'Honda', 'Civic', 2020], ['ABC1A02', 'Toyota', 'Corolla', 2019], ['BCD2B02', 'Fiat', 'Argo', 2022],
  ['CDE3C03', 'Chevrolet', 'Onix', 2021], ['DEF4D04', 'Volkswagen', 'Polo', 2018], ['EFG5E05', 'Hyundai', 'HB20', 2023],
  ['FGH6F06', 'Renault', 'Duster', 2020],
];

/** Esquema do serviço de clientes/veículos. Idempotente: serve para banco novo e para o banco do MVP anterior. */
@Injectable()
export class CustomersSchema implements OnModuleInit {
  private readonly logger = new Logger(CustomersSchema.name);
  constructor(private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS customer_profiles(id uuid primary key,tenant_id uuid not null,identity_user_id uuid,name text not null,email text,phone text not null,created_at timestamptz default now(),unique(tenant_id,id),unique(tenant_id,phone));
      CREATE INDEX IF NOT EXISTS idx_customer_tenant_phone ON customer_profiles(tenant_id,phone);
      ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS cep text, ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS address_number text,
        ADD COLUMN IF NOT EXISTS district text, ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text;
      CREATE TABLE IF NOT EXISTS vehicles(id uuid primary key,tenant_id uuid not null,customer_id uuid not null,plate text not null,make text,model text,year int,created_at timestamptz default now(),unique(tenant_id,plate),foreign key(tenant_id,customer_id) references customer_profiles(tenant_id,id));
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fipe_code text;
    `);
    if (process.env.BOOTSTRAP_DEMO === 'true') await this.seedDemo();
  }

  private async seedDemo(): Promise<void> {
    const existing = await this.db.query<{ n: number }>('select count(*)::int n from customer_profiles');
    if (existing.rows[0].n > 0) return;
    this.logger.log('Carregando dados de demonstração');
    const customers: DemoCustomer[] = [
      [601, 1, 301, 'Ana Cliente', 'ana@cliente.demo.local', '+5511991000301'],
      [602, 3, 301, 'Ana Cliente', 'ana@cliente.demo.local', '+5511991000301'],
      [603, 2, 303, 'Carla Cliente', 'carla@cliente.demo.local', '+5511991000303'],
    ];
    for (let t = 1; t <= 5; t++) customers.push([610 + t, t, 302, 'Bruno Cliente', 'bruno@cliente.demo.local', '+5511991000302']);
    for (const [id, tenant, user, name, email, phone] of customers) {
      await this.db.query('insert into customer_profiles(id,tenant_id,identity_user_id,name,email,phone) values($1,$2,$3,$4,$5,$6)', [demoId(id), demoId(tenant), demoId(user), name, email, phone]);
    }
    let k = 0;
    for (const [id, tenant, user] of customers) {
      const count = user === 301 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const [plate, make, model, year] = CARS[k++ % CARS.length];
        await this.db.query('insert into vehicles(id,tenant_id,customer_id,plate,make,model,year) values($1,$2,$3,$4,$5,$6,$7)', [demoId(700 + k), demoId(tenant), demoId(id), plate, make, model, year]);
      }
    }
    // Ana também é cliente da oficina B, com veículo próprio nessa oficina.
    await this.db.query('insert into customer_profiles(id,tenant_id,identity_user_id,name,email,phone) values($1,$2,$3,$4,$5,$6)', [demoId(604), demoId(2), demoId(301), 'Ana Cliente', 'ana@cliente.demo.local', '+5511991000301']);
    await this.db.query('insert into vehicles(id,tenant_id,customer_id,plate,make,model,year) values($1,$2,$3,$4,$5,$6,$7)', [demoId(750), demoId(2), demoId(604), 'ANA2B34', 'Honda', 'Fit', 2021]);
  }
}
