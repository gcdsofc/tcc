import { describe, expect, it } from 'vitest';
import { capabilities, primaryStaffRole } from './permissions';

describe('capabilities por papel', () => {
  it('administrador da oficina pode tudo da operação e vê equipe/convites', () => {
    const can = capabilities(['tenant_admin']);
    expect(can.isOwner).toBe(true);
    expect(can.isStaff).toBe(true);
    expect(can.canRegister).toBe(true);
    expect(can.canOpenOrders).toBe(true);
    expect(can.canDiagnose).toBe(true);
    expect(can.canCreateEstimate).toBe(true);
    expect(can.canFinance).toBe(true);
    expect(can.canMessage).toBe(true);
  });

  it('atendente cadastra e abre ordens, mas não diagnostica nem vê finanças', () => {
    const can = capabilities(['attendant']);
    expect(can.isStaff).toBe(true);
    expect(can.isOwner).toBe(false);
    expect(can.canRegister).toBe(true);
    expect(can.canCreateEstimate).toBe(true);
    expect(can.canDiagnose).toBe(false);
    expect(can.canFinance).toBe(false);
  });

  it('mecânico diagnostica e orça, mas não cadastra cliente', () => {
    const can = capabilities(['mechanic']);
    expect(can.isMechanic).toBe(true);
    expect(can.isStaff).toBe(false);
    expect(can.canDiagnose).toBe(true);
    expect(can.canCreateEstimate).toBe(true);
    expect(can.canRegister).toBe(false);
    expect(can.canReadPeople).toBe(true);
  });

  it('financeiro só vê finanças e conversa', () => {
    const can = capabilities(['finance']);
    expect(can.isFinance).toBe(true);
    expect(can.isStaff).toBe(false);
    expect(can.canFinance).toBe(true);
    expect(can.canRegister).toBe(false);
    expect(can.canDiagnose).toBe(false);
    expect(can.canCreateEstimate).toBe(false);
    expect(can.canReadPeople).toBe(false);
  });

  it('cliente só lê o próprio e conversa; não cria orçamento', () => {
    const can = capabilities(['customer']);
    expect(can.isCustomer).toBe(true);
    expect(can.canMessage).toBe(true);
    expect(can.canReadPeople).toBe(true);
    expect(can.canCreateEstimate).toBe(false);
    expect(can.canRegister).toBe(false);
    expect(can.canFinance).toBe(false);
  });

  it('papéis vazios ou indefinidos não liberam nada', () => {
    for (const roles of [[], undefined]) {
      const can = capabilities(roles);
      expect(can.isStaff).toBe(false);
      expect(can.canRegister).toBe(false);
      expect(can.canMessage).toBe(false);
      expect(can.canReadPeople).toBe(false);
    }
  });
});

describe('primaryStaffRole', () => {
  it('ignora o papel de cliente ao exibir o papel da equipe', () => {
    expect(primaryStaffRole(['customer', 'mechanic'])).toBe('mechanic');
    expect(primaryStaffRole(['tenant_admin'])).toBe('tenant_admin');
    expect(primaryStaffRole(['customer'])).toBeUndefined();
  });
});
