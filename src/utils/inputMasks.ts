/**
 * Utilitários centralizados de máscaras e validação em tempo real para campos de entrada.
 * Garante que cada campo responda estritamente ao seu formato e caracteres permitidos.
 */

const isControlOrShortcutKey = (event: any): boolean => {
  const nativeEvent = event?.nativeEvent ?? event;
  if (nativeEvent?.ctrlKey || nativeEvent?.metaKey || nativeEvent?.altKey) {
    return true;
  }
  const key: string = nativeEvent?.key ?? '';
  return key.length !== 1; // Enter, Backspace, Tab, Delete, Arrow*, etc.
};

/**
 * Formata CPF estritamente no padrão XXX.XXX.XXX-XX (apenas dígitos, máx 11 dígitos).
 */
export const formatCpfInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Formata telefone estritamente no padrão (XX) XXXX-XXXX (fixo, 10 dígitos)
 * ou (XX) XXXXX-XXXX (celular, 11 dígitos), aceitando apenas números.
 */
export const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);

  if (digits.length <= 6) {
    return `(${areaCode}) ${subscriber}`;
  }
  if (digits.length <= 10) {
    return `(${areaCode}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  }
  return `(${areaCode}) ${subscriber.slice(0, 5)}-${subscriber.slice(5, 9)}`;
};

/**
 * Sanitiza e formata e-mail em tempo real:
 * - Proíbe espaços e símbolos inválidos
 * - Proíbe 2 arrobas ("@") ou "@" no início
 * - Proíbe pontos duplicados ("..") ou ponto colado ao "@"
 * - No domínio (após "@"), permite apenas letras, números, ponto e hífen
 */
export const formatEmailInput = (value: string): string => {
  const withoutSpaces = value
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();

  // Permite apenas caracteres válidos de e-mail
  const allowedChars = withoutSpaces.replace(/[^a-z0-9._@-]/g, '');

  // Impede iniciar com @, ponto, hífen ou sublinhado
  const trimmedStart = allowedChars.replace(/^[@._-]+/, '');

  const atIndex = trimmedStart.indexOf('@');
  if (atIndex === -1) {
    return trimmedStart.replace(/\.{2,}/g, '.');
  }

  const localPart = trimmedStart
    .slice(0, atIndex)
    .replace(/\.{2,}/g, '.')
    .replace(/\.$/, ''); // impede ponto imediatamente antes do @

  const rawDomainPart = trimmedStart
    .slice(atIndex + 1)
    .replace(/@/g, '') // proíbe segunda arroba ("@")
    .replace(/[^a-z0-9.-]/g, '') // no domínio não é permitido "_"
    .replace(/^[.-]+/, '') // domínio não pode iniciar com "." ou "-"
    .replace(/\.{2,}/g, '.');

  return `${localPart}@${rawDomainPart}`;
};

/**
 * Formata data de nascimento no padrão DD/MM/AAAA (apenas números, máx 8 dígitos).
 */
export const formatBirthDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

/**
 * Formata número de cartão em blocos de 4 dígitos: 0000 0000 0000 0000 (máx 16 dígitos).
 */
export const formatCardNumberInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

/**
 * Formata validade de cartão no padrão MM/AA (apenas números, mês entre 01 e 12).
 */
export const formatCardExpiryInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length === 1) {
    // Se o primeiro dígito for maior que 1 (ex: 4), prefixa com 0 -> 04
    if (Number(digits) > 1) return `0${digits}`;
    return digits;
  }
  let month = Number(digits.slice(0, 2));
  if (month === 0) month = 1;
  if (month > 12) month = 12;
  const monthStr = String(month).padStart(2, '0');
  if (digits.length === 2) return monthStr;
  return `${monthStr}/${digits.slice(2, 4)}`;
};

/**
 * Mantém apenas dígitos numéricos até o limite informado.
 */
export const formatDigitsOnly = (value: string, maxDigits = 6): string =>
  value.replace(/\D/g, '').slice(0, maxDigits);

/**
 * Formata valor monetário decimal permitindo apenas números e uma única vírgula com até 2 casas decimais.
 */
export const formatCurrencyInput = (value: string, maxIntegerDigits = 5): string => {
  const normalized = value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  if (!normalized) return '';

  const commaIndex = normalized.indexOf(',');
  if (commaIndex === -1) {
    return normalized.slice(0, maxIntegerDigits);
  }

  const intPart = normalized.slice(0, commaIndex).slice(0, maxIntegerDigits) || '0';
  const decPart = normalized
    .slice(commaIndex + 1)
    .replace(/,/g, '')
    .slice(0, 2);

  return `${intPart},${decPart}`;
};

/**
 * Formata apelido de cartão/banco (letras, números e espaços simples, sem símbolos especiais).
 */
export const formatAlphanumericTitle = (value: string): string =>
  value
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9\s-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+/, '');

/**
 * Bloqueia no onKeyPress qualquer tecla que não seja dígito numérico (0-9).
 */
export const blockNonDigitKeyPress = (event: any, onEnter?: () => void) => {
  const key = event?.nativeEvent?.key ?? event?.key;
  if (key === 'Enter') {
    onEnter?.();
    return;
  }
  if (isControlOrShortcutKey(event)) return;
  if (!/^[0-9]$/.test(key)) {
    event?.preventDefault?.();
  }
};

/**
 * Bloqueia no onKeyPress teclas inválidas para campo de e-mail (espaços, 2ª "@", símbolos proibidos).
 */
export const blockInvalidEmailKeyPress = (
  event: any,
  currentEmail: string,
  onEnter?: () => void
) => {
  const key = event?.nativeEvent?.key ?? event?.key;
  if (key === 'Enter') {
    onEnter?.();
    return;
  }
  if (isControlOrShortcutKey(event)) return;

  if (!/^[a-zA-Z0-9._@-]$/.test(key)) {
    event?.preventDefault?.();
    return;
  }
  if (key === '@' && (!currentEmail || currentEmail.includes('@') || currentEmail.endsWith('.'))) {
    event?.preventDefault?.();
    return;
  }
  if (key === '.' && (!currentEmail || currentEmail.endsWith('.') || currentEmail.endsWith('@'))) {
    event?.preventDefault?.();
    return;
  }
  if (key === '_' && currentEmail.includes('@')) {
    event?.preventDefault?.();
  }
};

/**
 * Bloqueia no onKeyPress números e símbolos em campos de nome de pessoa.
 */
export const blockNonLetterKeyPress = (event: any, onEnter?: () => void) => {
  const key = event?.nativeEvent?.key ?? event?.key;
  if (key === 'Enter') {
    onEnter?.();
    return;
  }
  if (isControlOrShortcutKey(event)) return;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]$/.test(key)) {
    event?.preventDefault?.();
  }
};

/**
 * Bloqueia no onKeyPress teclas inválidas em campos de valor monetário.
 */
export const blockInvalidCurrencyKeyPress = (
  event: any,
  currentValue: string,
  onEnter?: () => void
) => {
  const key = event?.nativeEvent?.key ?? event?.key;
  if (key === 'Enter') {
    onEnter?.();
    return;
  }
  if (isControlOrShortcutKey(event)) return;
  if ((key === ',' || key === '.') && currentValue.includes(',')) {
    event?.preventDefault?.();
    return;
  }
  if (!/^[0-9,.]$/.test(key)) {
    event?.preventDefault?.();
  }
};

