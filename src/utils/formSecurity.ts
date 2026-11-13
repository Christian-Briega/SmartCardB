/**
 * Form Security & Input Sanitization
 * Protege campos contra XSS, Script Injection e ataques de força bruta.
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Muito Fraca' | 'Fraca' | 'Média' | 'Forte' | 'Excelente';
  color: string;
  feedback: string[];
}

/**
 * Sanitiza texto removendo caracteres ou padrões potencialmente perigosos (XSS, scripts, tags)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove <style> tags and contents
    .replace(/<[^>]*>?/gm, '') // Remove remaining HTML tags
    .replace(/javascript:/gi, '') // Remove javascript pseudo-protocol
    .replace(/on\w+=/gi, '') // Remove inline handlers (onclick, onerror)
    .trim();
}

/**
 * Avalia a força da senha com regras de segurança bancária
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      label: 'Muito Fraca',
      color: '#EF4444',
      feedback: ['Digite uma senha'],
    };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Pelo menos 8 caracteres');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Pelo menos uma letra maiúscula');
  }

  if (/[a-z]/.test(password)) {
    score += 0.5;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Pelo menos um número');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('Pelo menos um caractere especial (!@#$%)');
  }

  const normalizedScore = Math.min(4, Math.floor(score));

  switch (normalizedScore) {
    case 0:
    case 1:
      return {
        score: normalizedScore,
        label: 'Fraca',
        color: '#EF4444',
        feedback,
      };
    case 2:
      return {
        score: normalizedScore,
        label: 'Média',
        color: '#F59E0B',
        feedback,
      };
    case 3:
      return {
        score: normalizedScore,
        label: 'Forte',
        color: '#10B981',
        feedback,
      };
    case 4:
    default:
      return {
        score: 4,
        label: 'Excelente',
        color: '#059669',
        feedback: [],
      };
  }
}

/**
 * Rate Limiter de Login para prevenir ataques de Força Bruta
 */
class LoginRateLimiter {
  private attempts: number = 0;
  private lockedUntil: number = 0;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 30000; // 30 segundos

  public isLocked(): { locked: boolean; remainingSeconds: number } {
    const now = Date.now();
    if (this.lockedUntil > now) {
      const remainingSeconds = Math.ceil((this.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }
    return { locked: false, remainingSeconds: 0 };
  }

  public registerFailedAttempt(): { locked: boolean; remainingSeconds: number; attemptsLeft: number } {
    this.attempts += 1;
    if (this.attempts >= this.MAX_ATTEMPTS) {
      this.lockedUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this.attempts = 0;
      return { locked: true, remainingSeconds: Math.ceil(this.LOCKOUT_DURATION_MS / 1000), attemptsLeft: 0 };
    }
    return { locked: false, remainingSeconds: 0, attemptsLeft: this.MAX_ATTEMPTS - this.attempts };
  }

  public resetAttempts(): void {
    this.attempts = 0;
    this.lockedUntil = 0;
  }
}

export const loginRateLimiter = new LoginRateLimiter();

