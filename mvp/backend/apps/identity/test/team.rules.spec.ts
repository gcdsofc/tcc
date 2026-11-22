import { isStaffRole, nextRoles, rejectMemberChange } from '../src/team.rules';

const base = { actorUserId: 'admin', targetUserId: 'pessoa', currentRoles: ['attendant'], currentStatus: 'active', activeAdmins: 2 };

describe('regras da equipe da oficina', () => {
  it('aceita só papéis de equipe; cliente entra por convite', () => {
    expect(['tenant_admin', 'attendant', 'mechanic', 'finance'].every(isStaffRole)).toBe(true);
    expect(isStaffRole('customer')).toBe(false);
    expect(isStaffRole('platform_admin')).toBe(false);
  });

  it('permite trocar papel e desativar outra pessoa', () => {
    expect(rejectMemberChange({ ...base, nextRole: 'mechanic' })).toBeNull();
    expect(rejectMemberChange({ ...base, nextStatus: 'inactive' })).toBeNull();
    expect(rejectMemberChange({ ...base, currentStatus: 'inactive', nextStatus: 'active' })).toBeNull();
  });

  it('não deixa o administrador alterar o próprio acesso', () => {
    expect(rejectMemberChange({ ...base, targetUserId: 'admin', nextStatus: 'inactive' })).toMatch(/próprio acesso/);
  });

  it('nunca deixa a oficina sem administrador ativo', () => {
    const lastAdmin = { ...base, currentRoles: ['tenant_admin'], activeAdmins: 1 };
    expect(rejectMemberChange({ ...lastAdmin, nextStatus: 'inactive' })).toMatch(/pelo menos um administrador/);
    expect(rejectMemberChange({ ...lastAdmin, nextRole: 'attendant' })).toMatch(/pelo menos um administrador/);
    expect(rejectMemberChange({ ...lastAdmin, activeAdmins: 2, nextRole: 'attendant' })).toBeNull();
  });

  it('rejeita papel ou situação inválidos e clientes puros', () => {
    expect(rejectMemberChange({ ...base, nextRole: 'customer' })).toBe('Papel inválido.');
    expect(rejectMemberChange({ ...base, nextStatus: 'deleted' })).toBe('Situação inválida.');
    expect(rejectMemberChange({ ...base, currentRoles: ['customer'], nextRole: 'attendant' })).toMatch(/convite/);
  });

  it('mantém o papel de cliente ao trocar o papel de equipe', () => {
    expect(nextRoles(['attendant'], 'mechanic')).toEqual(['mechanic']);
    expect(nextRoles(['attendant', 'customer'], 'finance')).toEqual(['finance', 'customer']);
  });
});
