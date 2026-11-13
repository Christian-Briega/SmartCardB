import {
  formatCpfInput,
  formatPhoneInput,
  formatEmailInput,
  formatBirthDateInput,
  formatCardNumberInput,
  formatCardExpiryInput,
  formatCurrencyInput,
  formatDigitsOnly,
} from '../src/utils/inputMasks';
import { formatPersonName } from '../src/utils/formatPersonName';

describe('Validação e Máscaras de Campos (inputMasks)', () => {
  describe('Campo de CPF (XXX.XXX.XXX-XX)', () => {
    it('deve aceitar apenas números e aplicar a máscara XXX.XXX.XXX-XX automaticamente', () => {
      expect(formatCpfInput('12345678901')).toBe('123.456.789-01');
      expect(formatCpfInput('123.456')).toBe('123.456');
      expect(formatCpfInput('abc123!@#456$%^789&*(01xyz99')).toBe('123.456.789-01');
    });
  });

  describe('Campo de E-mail', () => {
    it('deve proibir 2 arrobas ("@"), espaços e símbolos não permitidos', () => {
      expect(formatEmailInput('usuario@@dominio.com')).toBe('usuario@dominio.com');
      expect(formatEmailInput('user@dom@inio.com')).toBe('user@dominio.com');
      expect(formatEmailInput('nome sobrenome!#$%*()@gmail.com')).toBe('nomesobrenome@gmail.com');
      expect(formatEmailInput('@inicioinvalido@teste.com')).toBe('inicioinvalido@teste.com');
    });
  });

  describe('Campo de Telefone ((XX) XXXXX-XXXX / (XX) XXXX-XXXX)', () => {
    it('deve formatar automaticamente telefone fixo (10 dígitos) como (XX) XXXX-XXXX', () => {
      expect(formatPhoneInput('1134567890')).toBe('(11) 3456-7890');
    });

    it('deve formatar automaticamente celular (11 dígitos) como (XX) XXXXX-XXXX e bloquear letras/símbolos', () => {
      expect(formatPhoneInput('11987654321')).toBe('(11) 98765-4321');
      expect(formatPhoneInput('ab(11) 98765-4321!@#99')).toBe('(11) 98765-4321');
    });
  });

  describe('Demais campos do app (Nome, Data, Cartão, Moeda)', () => {
    it('deve remover números e símbolos em nomes próprios', () => {
      expect(formatPersonName('joão 123 silva @#$')).toBe('João Silva ');
    });

    it('deve formatar data de nascimento DD/MM/AAAA, cartão, validade MM/AA, CVV e moeda', () => {
      expect(formatBirthDateInput('15082000abc')).toBe('15/08/2000');
      expect(formatCardNumberInput('1234567812345678xyz')).toBe('1234 5678 1234 5678');
      expect(formatCardExpiryInput('1228')).toBe('12/28');
      expect(formatDigitsOnly('12a3b4', 3)).toBe('123');
      expect(formatCurrencyInput('R$ 25,50abc,99')).toBe('25,50');
    });
  });
});

