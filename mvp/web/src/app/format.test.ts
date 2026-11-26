import { describe, expect, it } from 'vitest';
import {
  currency,
  estimateStatusLabel,
  initials,
  orderStatusLabel,
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
