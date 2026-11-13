import { isValidCpf } from '../src/utils/isValidCpf';

describe('Protocolo Anti-Gravidade - Validador de CPF', () => {
  it('deve validar um CPF válido com máscara', () => {
    // CPFs com dígitos verificadores matematicamente corretos
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.444.777-35')).toBe(true);
  });

  it('deve validar um CPF válido sem pontuação', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('deve rejeitar sequências de dígitos repetidos conhecidas', () => {
    expect(isValidCpf('000.000.000-00')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('222.222.222-22')).toBe(false);
    expect(isValidCpf('999.999.999-99')).toBe(false);
  });

  it('deve rejeitar CPFs com dígitos verificadores incorretos', () => {
    expect(isValidCpf('529.982.247-00')).toBe(false);
    expect(isValidCpf('123.456.789-10')).toBe(false);
  });

  it('deve rejeitar CPFs com quantidade de dígitos menor ou maior que 11', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf('123.456')).toBe(false);
    expect(isValidCpf('1234567890123')).toBe(false);
  });
});

