import { describe, expect, it } from 'vitest';
import {
  currency,
  estimateStatusLabel,
  formatPhone,
  initials,
  orderStatusLabel,
  orderVehicleModel,
  roleLabel,
  roleListLabel,
} from './format';

describe('rótulos', () => {
  it('traduz status de ordem conhecidos e devolve o original para desconhecidos', () => {
    expect(orderStatusLabel('awaiting_approval')).toBe('Aguardando aprovação');
    expect(orderStatusLabel('ready')).toBe('Pronta para retirada');
    expect(orderStatusLabel('algo_novo')).toBe('algo_novo');
  });

  it('traduz status de orçamento', () => {
    expect(estimateStatusLabel('pending')).toBe('Aguardando');
    expect(estimateStatusLabel('superseded')).toBe('Substituído');
  });

  it('traduz papéis e listas de papéis', () => {
    expect(roleLabel('tenant_admin')).toBe('Administrador');
    expect(roleListLabel(['tenant_admin', 'finance'])).toBe('Administrador · Financeiro');
    expect(roleListLabel(undefined)).toBe('');
  });
});

describe('currency', () => {
  it('formata em reais e trata nulos', () => {
    expect(currency(1234.5)).toContain('1.234,50');
    expect(currency('250')).toContain('250,00');
    expect(currency(null)).toContain('0,00');
  });
});

describe('initials', () => {
  it('usa a primeira letra maiúscula ou o padrão', () => {
    expect(initials('Ana Paula')).toBe('A');
    expect(initials('')).toBe('G');
    expect(initials(undefined, 'P')).toBe('P');
  });
});

describe('orderVehicleModel', () => {
  it('junta marca, modelo e ano ignorando campos vazios', () => {
    expect(orderVehicleModel({ vehicle_make: 'Fiat', vehicle_model: 'Uno', vehicle_year: 2015 })).toBe('Fiat Uno 2015');
    expect(orderVehicleModel({ vehicle_make: null, vehicle_model: 'Onix', vehicle_year: null })).toBe('Onix');
    expect(orderVehicleModel({})).toBe('');
  });
});

describe('formatPhone', () => {
  it('formata o telefone canônico (só dígitos com 55) para exibição', () => {
    expect(formatPhone('5511991000301')).toBe('+55 (11) 99100-0301');
    expect(formatPhone('551133334444')).toBe('+55 (11) 3333-4444');
  });

  it('mostra estrangeiros com + e devolve formatos antigos como vieram', () => {
    expect(formatPhone('351912345678')).toBe('+351912345678');
    expect(formatPhone('+55 11 9999')).toBe('+55 11 9999');
    expect(formatPhone(null)).toBe('');
  });
});
