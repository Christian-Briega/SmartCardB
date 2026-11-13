import {
  validateAutoRechargeConfig,
  shouldTriggerAutoRecharge,
  calculateRechargeResult,
  MIN_AUTO_RECHARGE_AMOUNT,
  MIN_AUTO_RECHARGE_THRESHOLD,
} from '../src/utils/autoRechargeLogic';

describe('Protocolo Anti-Gravidade - Recarga Automática', () => {
  describe('validateAutoRechargeConfig', () => {
    it('deve aprovar configuração quando o recurso estiver desativado', () => {
      const result = validateAutoRechargeConfig({ enabled: false });
      expect(result.isValid).toBe(true);
    });

    it('deve aprovar uma configuração completa e válida', () => {
      const result = validateAutoRechargeConfig({
        enabled: true,
        selectedCardId: 'card-123',
        threshold: 15,
        rechargeAmount: 50,
        paymentMethod: 'card-credit-1',
      });
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('deve rejeitar se não houver cartão de transporte selecionado', () => {
      const result = validateAutoRechargeConfig({
        enabled: true,
        selectedCardId: null,
        threshold: 15,
        rechargeAmount: 50,
        paymentMethod: 'card-credit-1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('passe de transporte');
    });

    it('deve rejeitar recarga com limite inferior a R$ 10,00', () => {
      const result = validateAutoRechargeConfig({
        enabled: true,
        selectedCardId: 'card-123',
        threshold: 5,
        rechargeAmount: 50,
        paymentMethod: 'card-credit-1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain(`R$ ${MIN_AUTO_RECHARGE_THRESHOLD}`);
    });

    it('deve rejeitar recarga com valor menor que R$ 10,00', () => {
      const result = validateAutoRechargeConfig({
        enabled: true,
        selectedCardId: 'card-123',
        threshold: 10,
        rechargeAmount: 5,
        paymentMethod: 'card-credit-1',
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain(`R$ ${MIN_AUTO_RECHARGE_AMOUNT}`);
    });

    it('deve rejeitar se não houver método de pagamento selecionado', () => {
      const result = validateAutoRechargeConfig({
        enabled: true,
        selectedCardId: 'card-123',
        threshold: 15,
        rechargeAmount: 30,
        paymentMethod: null,
      });
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('forma de pagamento');
    });
  });

  describe('shouldTriggerAutoRecharge', () => {
    it('deve disparar quando saldo estiver estritamente abaixo do limite', () => {
      expect(shouldTriggerAutoRecharge(8.5, 15)).toBe(true);
    });

    it('deve disparar quando saldo for exatamente igual ao limite', () => {
      expect(shouldTriggerAutoRecharge(10, 10)).toBe(true);
    });

    it('não deve disparar quando saldo for superior ao limite', () => {
      expect(shouldTriggerAutoRecharge(25.4, 15)).toBe(false);
    });
  });

  describe('calculateRechargeResult', () => {
    it('deve calcular corretamente novo saldo e número de viagens na tarifa padrão (R$ 4,40)', () => {
      const { newBalance, newRides } = calculateRechargeResult(8.0, 50.0);
      expect(newBalance).toBe(58.0);
      // Math.floor(58 / 4.4) = 13
      expect(newRides).toBe(13);
    });
  });
});

