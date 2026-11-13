export interface AutoRechargeValidationInput {
  enabled: boolean;
  selectedCardId?: string | null;
  threshold?: number | null;
  rechargeAmount?: number | null;
  paymentMethod?: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const MIN_AUTO_RECHARGE_AMOUNT = 10;
export const MIN_AUTO_RECHARGE_THRESHOLD = 10;
export const STANDARD_BUS_FARE = 4.4;

/**
 * Validates auto recharge configuration according to bank and transport regulations
 */
export function validateAutoRechargeConfig(
  input: AutoRechargeValidationInput
): ValidationResult {
  if (!input.enabled) {
    return { isValid: true };
  }

  if (!input.selectedCardId) {
    return {
      isValid: false,
      errorMessage: 'Selecione um passe de transporte para vincular à recarga automática.',
    };
  }

  if (input.threshold === null || input.threshold === undefined) {
    return {
      isValid: false,
      errorMessage: 'Defina o saldo mínimo de disparo do gatilho.',
    };
  }

  if (input.threshold < MIN_AUTO_RECHARGE_THRESHOLD) {
    return {
      isValid: false,
      errorMessage: `O saldo limite de disparo não pode ser inferior a R$ ${MIN_AUTO_RECHARGE_THRESHOLD},00.`,
    };
  }

  if (input.rechargeAmount === null || input.rechargeAmount === undefined) {
    return {
      isValid: false,
      errorMessage: 'Escolha o valor a ser recarregado automaticamente.',
    };
  }

  if (input.rechargeAmount < MIN_AUTO_RECHARGE_AMOUNT) {
    return {
      isValid: false,
      errorMessage: `O valor da recarga não pode ser menor que R$ ${MIN_AUTO_RECHARGE_AMOUNT},00.`,
    };
  }

  if (!input.paymentMethod) {
    return {
      isValid: false,
      errorMessage: 'Selecione uma forma de pagamento válida vinculada.',
    };
  }

  return { isValid: true };
}

/**
 * Determines whether the auto recharge trigger should fire
 */
export function shouldTriggerAutoRecharge(
  currentBalance: number,
  threshold: number
): boolean {
  return currentBalance <= threshold;
}

/**
 * Computes resulting balance and rides after an automated recharge
 */
export function calculateRechargeResult(
  currentBalance: number,
  rechargeAmount: number,
  fare: number = STANDARD_BUS_FARE
): { newBalance: number; newRides: number } {
  const newBalance = Math.round((currentBalance + rechargeAmount) * 100) / 100;
  const newRides = Math.floor(newBalance / fare);
  return { newBalance, newRides };
}

