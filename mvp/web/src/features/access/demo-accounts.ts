// Perfis de demonstração exibidos no seletor da tela de login.
// Todas as contas usam a senha padrão do README no ambiente local.

export interface DemoAccount {
  label: string;
  email: string;
}

export interface DemoGroup {
  group: string;
  accounts: DemoAccount[];
}

export const DEMO_PASSWORD = 'GarageOps2026!';

export const demoAccounts: DemoGroup[] = [
  {
    group: 'Plataforma GarageOps',
    accounts: [
      { label: 'Administrador da plataforma · gerencia oficinas', email: 'plataforma@garageops.local' },
    ],
  },
  {
    group: 'Garagem Central · Oficina A',
    accounts: [
      { label: 'Administrador', email: 'admin1@demo.garageops.local' },
      { label: 'Atendente', email: 'atendente.a@demo.garageops.local' },
      { label: 'Mecânico', email: 'mecanico.a@demo.garageops.local' },
      { label: 'Financeiro', email: 'financeiro.a@demo.garageops.local' },
    ],
  },
  {
    group: 'Horizonte · Oficina B',
    accounts: [
      { label: 'Administrador', email: 'admin2@demo.garageops.local' },
      { label: 'Atendente', email: 'atendente.h@demo.garageops.local' },
      { label: 'Mecânico', email: 'mecanico.h@demo.garageops.local' },
      { label: 'Financeiro', email: 'financeiro.b@demo.garageops.local' },
    ],
  },
  {
    group: 'Torque · Oficina C',
    accounts: [
      { label: 'Administrador', email: 'admin3@demo.garageops.local' },
      { label: 'Atendente', email: 'atendente.t@demo.garageops.local' },
      { label: 'Mecânico', email: 'mecanico.t1@demo.garageops.local' },
      { label: 'Financeiro', email: 'financeiro.c@demo.garageops.local' },
    ],
  },
  {
    group: 'Box 12 · Oficina D',
    accounts: [
      { label: 'Administrador', email: 'admin4@demo.garageops.local' },
      { label: 'Atendente', email: 'atendente.b1@demo.garageops.local' },
      { label: 'Mecânico', email: 'mecanico.box@demo.garageops.local' },
      { label: 'Financeiro', email: 'financeiro.d@demo.garageops.local' },
    ],
  },
  {
    group: 'Rota Auto Center · Oficina E',
    accounts: [
      { label: 'Administrador', email: 'admin5@demo.garageops.local' },
      { label: 'Atendente', email: 'atendente.r1@demo.garageops.local' },
      { label: 'Mecânico', email: 'mecanico.r1@demo.garageops.local' },
      { label: 'Financeiro', email: 'financeiro.e@demo.garageops.local' },
    ],
  },
  {
    group: 'Clientes',
    accounts: [
      { label: 'Ana · vinculada às oficinas A, B e C', email: 'ana@cliente.demo.local' },
      { label: 'Bruno · vinculado às cinco oficinas', email: 'bruno@cliente.demo.local' },
    ],
  },
];
