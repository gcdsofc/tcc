import { canCloseRefused, canExecute, estimateTotal, isSettled, paymentFits, validateEstimateItems } from '../src/domain';

describe('regras de orçamento e ordem', () => {
  it('calcula orçamento com serviços e peças digitados manualmente, sem estoque', () => {
    const items = validateEstimateItems([
      { kind: 'service', description: 'Mão de obra', quantity: 2, unitPrice: 180 },
      { kind: 'part', description: 'Filtro adquirido da autopeças parceira', quantity: 1, unitPrice: 75 },
    ]);
    expect(estimateTotal(items)).toBe(435);
    expect(items.some((item) => 'stock' in item)).toBe(false);
  });

  it('aceita números enviados como texto pelo formulário', () => {
    expect(validateEstimateItems([{ kind: 'service', description: ' Revisão ', quantity: '1.5', unitPrice: '100' }]))
      .toEqual([{ kind: 'service', description: 'Revisão', quantity: 1.5, unitPrice: 100 }]);
  });

  it.each([
    { kind: 'service', description: 'x', quantity: 0, unitPrice: 1 },
    { kind: 'part', description: 'x', quantity: 1, unitPrice: -1 },
    { kind: 'stock', description: 'x', quantity: 1, unitPrice: 1 },
    { kind: 'service', description: '   ', quantity: 1, unitPrice: 1 },
    { kind: 'service', description: 'x'.repeat(241), quantity: 1, unitPrice: 1 },
  ])('rejeita item inválido %#', (item) => {
    expect(() => validateEstimateItems([item])).toThrow('Item de orçamento inválido.');
  });

  it('exige de 1 a 30 itens', () => {
    expect(() => validateEstimateItems([])).toThrow('Informe de 1 a 30 itens.');
    expect(() => validateEstimateItems('itens')).toThrow('Informe de 1 a 30 itens.');
    const many = Array.from({ length: 31 }, () => ({ kind: 'service', description: 'x', quantity: 1, unitPrice: 1 }));
    expect(() => validateEstimateItems(many)).toThrow('Informe de 1 a 30 itens.');
  });

  it('não autoriza execução sem aprovação vigente', () => {
    expect(canExecute('awaiting_approval', false)).toBe(false);
    expect(canExecute('approved', true)).toBe(true);
    expect(canExecute('in_progress', true)).toBe(true);
    expect(canExecute('closed_refused', true)).toBe(false);
  });

  it('só permite encerrar como recusa quando a versão mais recente foi recusada', () => {
    expect(canCloseRefused('refused')).toBe(true);
    expect(canCloseRefused('pending')).toBe(false);
    expect(canCloseRefused('approved')).toBe(false);
  });

  it('pagamento não passa do saldo e encerramento exige quitação', () => {
    expect(paymentFits(200, 0, 200)).toBe(true);
    expect(paymentFits(150, 100, 200)).toBe(false);
    expect(paymentFits(0, 0, 200)).toBe(false);
    expect(isSettled(200, 200)).toBe(true);
    expect(isSettled(200, 199.5)).toBe(false);
    expect(isSettled(0, 0)).toBe(false);
  });
});
