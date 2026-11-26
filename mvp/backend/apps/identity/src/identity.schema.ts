import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Database, normalizePhone, phoneSql } from '../../../libs/common/src';

export const demoId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DEMO_PASSWORD = 'GarageOps2026!';

const OFFICES: [string, string, string][] = [
  ['Garagem Central', 'garagem-central', '#0f766e'],
  ['Horizonte', 'horizonte', '#2563eb'],
  ['Torque', 'torque', '#d97706'],
  ['Box 12', 'box-12', '#7c3aed'],
  ['Rota Auto Center', 'rota-auto-center', '#be123c'],
];

/** [id, nome, e-mail, telefone, oficina (1-5) ou null para clientes, papel] */
type DemoUser = [number, string, string, string, number | null, string];

function demoUsers(): DemoUser[] {
  const users: DemoUser[] = OFFICES.map(([name], i) => [100 + i, `Admin ${name}`, `admin${i + 1}@demo.garageops.local`, `+55119900000${i + 1}`, i + 1, 'tenant_admin']);
  users.push(
    [201, 'Atendente Horizonte', 'atendente.h@demo.garageops.local', '+5511990000201', 2, 'attendant'],
    [202, 'Mecânico Horizonte', 'mecanico.h@demo.garageops.local', '+5511990000202', 2, 'mechanic'],
    [200, 'Mecânico Central', 'mecanico.a@demo.garageops.local', '+5511990000200', 1, 'mechanic'],
    [206, 'Atendente Garagem Central', 'atendente.a@demo.garageops.local', '+5511990000206', 1, 'attendant'],
    [205, 'Financeiro Garagem Central', 'financeiro.a@demo.garageops.local', '+5511990000205', 1, 'finance'],
    [270, 'Financeiro Horizonte', 'financeiro.b@demo.garageops.local', '+5511990000270', 2, 'finance'],
    [271, 'Financeiro Torque', 'financeiro.c@demo.garageops.local', '+5511990000271', 3, 'finance'],
    [272, 'Financeiro Box 12', 'financeiro.d@demo.garageops.local', '+5511990000272', 4, 'finance'],
    [273, 'Financeiro Rota Auto Center', 'financeiro.e@demo.garageops.local', '+5511990000273', 5, 'finance'],
    [203, 'Mecânico Horizonte 2', 'mecanico.h2@demo.garageops.local', '+5511990000203', 2, 'mechanic'],
    [204, 'Atendente Torque', 'atendente.t@demo.garageops.local', '+5511990000204', 3, 'attendant'],
    [240, 'Mecânico Box', 'mecanico.box@demo.garageops.local', '+5511990000240', 4, 'mechanic'],
  );
  for (let i = 0; i < 6; i++) users.push([210 + i, `Mecânico Torque ${i + 1}`, `mecanico.t${i + 1}@demo.garageops.local`, `+55119900002${10 + i}`, 3, 'mechanic']);
  for (let i = 0; i < 2; i++) users.push([220 + i, `Atendente Box ${i + 1}`, `atendente.b${i + 1}@demo.garageops.local`, `+551199000022${i}`, 4, 'attendant']);
  for (let i = 0; i < 4; i++) users.push([230 + i, `Mecânico Rota ${i + 1}`, `mecanico.r${i + 1}@demo.garageops.local`, `+551199000023${i}`, 5, 'mechanic']);
  for (let i = 0; i < 2; i++) users.push([260 + i, `Atendente Rota ${i + 1}`, `atendente.r${i + 1}@demo.garageops.local`, `+551199000026${i}`, 5, 'attendant']);
  users.push(
    [301, 'Ana Cliente', 'ana@cliente.demo.local', '+5511991000301', null, 'customer'],
    [302, 'Bruno Cliente', 'bruno@cliente.demo.local', '+5511991000302', null, 'customer'],
    [303, 'Carla Cliente', 'carla@cliente.demo.local', '+5511991000303', null, 'customer'],
  );
  return users;
}

/** Vínculos de cliente: Ana em A, B e C; Bruno nas cinco; Carla só na B. */
const CUSTOMER_LINKS: [number, number[]][] = [[301, [1, 2, 3]], [302, [1, 2, 3, 4, 5]], [303, [2]]];

/**
 * Cria/atualiza o esquema do serviço de identidade e carrega os dados de demonstração.
 * Idempotente: pode rodar em banco vazio ou em banco que já tem dados do MVP anterior.
 */
@Injectable()
export class IdentitySchema implements OnModuleInit {
  private readonly logger = new Logger(IdentitySchema.name);
  constructor(private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS tenants(id uuid primary key,name text not null,slug text unique not null,brand_color text not null default '#0f766e',created_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS users(id uuid primary key,name text not null,email text unique not null,phone text,password_hash text not null,status text not null default 'active',created_at timestamptz default now());
      CREATE TABLE IF NOT EXISTS memberships(id uuid primary key,user_id uuid references users(id),tenant_id uuid references tenants(id),roles text[] not null,status text not null default 'active',unique(user_id,tenant_id));
      CREATE TABLE IF NOT EXISTS invitations(id uuid primary key,tenant_id uuid references tenants(id),phone text not null,customer_name text not null,token_hash text not null,code_hash text not null,attempts int not null default 0,expires_at timestamptz not null,used_at timestamptz,revoked_at timestamptz,created_by uuid,created_at timestamptz default now());
      ALTER TABLE invitations ADD COLUMN IF NOT EXISTS attempts int not null default 0;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text not null default 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role text;
      -- Migração do MVP em Express: o papel "owner" passou a se chamar "tenant_admin".
      UPDATE memberships SET roles = array_replace(roles, 'owner', 'tenant_admin') WHERE 'owner' = ANY(roles);
      -- Telefones gravados antes da regra canônica (ver normalizePhone em libs/common) passam para o formato novo.
      UPDATE users SET phone = ${phoneSql('phone')} WHERE phone IS NOT NULL AND phone IS DISTINCT FROM ${phoneSql('phone')};
      UPDATE invitations SET phone = ${phoneSql('phone')} WHERE phone IS DISTINCT FROM ${phoneSql('phone')};
    `);
    if (process.env.BOOTSTRAP_DEMO === 'true') await this.seedDemo();
  }

  private async seedDemo(): Promise<void> {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await this.db.query(
      `insert into users(id,name,email,phone,password_hash,platform_role) values($1,$2,$3,$4,$5,'platform_admin') on conflict(id) do update set platform_role='platform_admin'`,
      [demoId(900), 'Administrador da Plataforma', 'plataforma@garageops.local', normalizePhone('+5511990000900'), hash],
    );
    const existing = await this.db.query<{ n: number }>('select count(*)::int n from tenants');
    if (existing.rows[0].n > 0) return; // dados já carregados (inclusive os criados durante as demonstrações)

    this.logger.log('Carregando dados de demonstração');
    for (let i = 0; i < OFFICES.length; i++) {
      const [name, slug, color] = OFFICES[i];
      await this.db.query('insert into tenants(id,name,slug,brand_color) values($1,$2,$3,$4)', [demoId(i + 1), name, slug, color]);
    }
    let membership = 500;
    for (const [id, name, email, phone, office, role] of demoUsers()) {
      await this.db.query('insert into users(id,name,email,phone,password_hash) values($1,$2,$3,$4,$5) on conflict(id) do nothing', [demoId(id), name, email, normalizePhone(phone), hash]);
      if (office) await this.db.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)', [demoId(membership++), demoId(id), demoId(office), [role]]);
    }
    for (const [user, offices] of CUSTOMER_LINKS) {
      for (const office of offices) {
        await this.db.query('insert into memberships(id,user_id,tenant_id,roles) values($1,$2,$3,$4)', [demoId(membership++), demoId(user), demoId(office), ['customer']]);
      }
    }
  }
}
