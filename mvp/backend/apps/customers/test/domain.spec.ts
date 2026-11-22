import { belongsToTenant, canReadProfile, normalizeCep, normalizeFipeCode, validFipeParams } from '../src/domain';

describe('regras de clientes e veículos', () => {
  it('cliente só lê perfil local ligado à própria identidade', () => {
    expect(canReadProfile(['customer'], 'u1', 'u1')).toBe(true);
    expect(canReadProfile(['customer'], 'u1', 'u2')).toBe(false);
    expect(canReadProfile(['customer'], 'u1', null)).toBe(false);
    expect(canReadProfile(['attendant'], 'u1', 'u2')).toBe(true);
  });

  it('papéis da oficina não removem o filtro de tenant', () => {
    expect(belongsToTenant('tenant-a', 'tenant-a')).toBe(true);
    expect(belongsToTenant('tenant-b', 'tenant-a')).toBe(false);
  });

  it('normaliza CEP e rejeita tamanho errado', () => {
    expect(normalizeCep('01310-100')).toBe('01310100');
    expect(normalizeCep('')).toBeNull();
    expect(normalizeCep(undefined)).toBeNull();
    expect(() => normalizeCep('123')).toThrow('CEP deve conter oito dígitos.');
  });

  it('aceita só código FIPE no formato 000000-0', () => {
    expect(normalizeFipeCode('014090-2')).toBe('014090-2');
    expect(normalizeFipeCode('14090-2')).toBeNull();
    expect(normalizeFipeCode('<script>')).toBeNull();
  });

  it('valida parâmetros da FIPE antes de chamar a API externa', () => {
    expect(validFipeParams({ brand: '25', model: '5940', year: '2014-1' })).toBe(true);
    expect(validFipeParams({ year: '32000-1' })).toBe(true);
    expect(validFipeParams({ brand: 'abc' })).toBe(false);
    expect(validFipeParams({ brand: '25', model: '../marcas' })).toBe(false);
    expect(validFipeParams({ year: '2014' })).toBe(false);
  });
});
