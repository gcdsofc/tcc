import { normalizePhone, phoneSql } from '../src/phone';

describe('normalizePhone (formato canônico do telefone)', () => {
  it('o mesmo número em formatos diferentes vira o mesmo valor', () => {
    const formats = ['+5511991000301', '+55 (11) 99100-0301', '(11) 99100-0301', '11991000301', '011 99100-0301', '0055 11 99100 0301', '55 11 99100.0301'];
    for (const value of formats) expect(normalizePhone(value)).toBe('5511991000301');
  });

  it('acrescenta 55 a fixo e celular brasileiros sem código do país', () => {
    expect(normalizePhone('(11) 3333-4444')).toBe('551133334444');
    expect(normalizePhone('11 93333-4444')).toBe('5511933334444');
  });

  it('mantém números que já têm país ou são estrangeiros', () => {
    expect(normalizePhone('+55 11 3333-4444')).toBe('551133334444');
    expect(normalizePhone('+351 912 345 678')).toBe('351912345678');
  });

  it('sem dígitos vira vazio (telefone não informado)', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone(undefined)).toBe('');
    expect(normalizePhone('sem telefone')).toBe('');
  });

  it('é idempotente', () => {
    for (const value of ['(11) 99100-0301', '+351 912 345 678', '1']) {
      expect(normalizePhone(normalizePhone(value))).toBe(normalizePhone(value));
    }
  });

  it('gera a expressão SQL equivalente para a coluna informada', () => {
    const sql = phoneSql('u.phone');
    expect(sql).toContain(String.raw`regexp_replace(coalesce(u.phone,''),'\D','','g')`);
    expect(sql).toContain("in (10,11) then '55'||");
  });
});
