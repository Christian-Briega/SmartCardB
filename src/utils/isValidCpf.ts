export const isValidCpf = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (numbers: string, weight: number) => {
    const sum = numbers
      .split('')
      .reduce((total, digit) => total + Number(digit) * weight--, 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(digits.slice(0, 9), 10) === Number(digits[9]) &&
    calculateDigit(digits.slice(0, 10), 11) === Number(digits[10])
  );
};
