import {
  sanitizeInput,
  evaluatePasswordStrength,
  loginRateLimiter,
} from '../src/utils/formSecurity';

describe('Protocolo Anti-Gravidade - Segurança de Formulários & Login', () => {
  describe('Sanitização de Input (Anti-XSS)', () => {
    it('deve remover tags HTML perigosas', () => {
      const dirty = '<script>alert("hack")</script>João Silva';
      const clean = sanitizeInput(dirty);
      expect(clean).toBe('João Silva');
    });

    it('deve remover pseudo-protocolos javascript:', () => {
      const dirty = 'javascript:doEvil()';
      const clean = sanitizeInput(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('deve remover inline handlers como onclick e onerror', () => {
      const dirty = '<img src="x" onerror="stealCookies()">';
      const clean = sanitizeInput(dirty);
      expect(clean).not.toContain('onerror=');
    });
  });

  describe('Medidor de Força de Senha (Nível Bancário)', () => {
    it('deve classificar senha vazia ou muito curta como Fraca', () => {
      const res = evaluatePasswordStrength('123');
      expect(res.label).toBe('Fraca');
      expect(res.score).toBeLessThanOrEqual(1);
    });

    it('deve classificar senha com 8 dígitos e números como Média', () => {
      const res = evaluatePasswordStrength('senha1234');
      expect(res.score).toBeGreaterThanOrEqual(1);
    });

    it('deve classificar senha completa com maiúscula, números e símbolos como Excelente', () => {
      const res = evaluatePasswordStrength('SmartBus@2026!');
      expect(res.label).toBe('Excelente');
      expect(res.score).toBe(4);
    });
  });

  describe('Proteção Anti-Brute Force (Rate Limiter)', () => {
    beforeEach(() => {
      loginRateLimiter.resetAttempts();
    });

    it('deve permitir tentativas normais e decrementar saldo restante', () => {
      const result = loginRateLimiter.registerFailedAttempt();
      expect(result.locked).toBe(false);
      expect(result.attemptsLeft).toBe(4);
    });

    it('deve bloquear após 5 tentativas consecutivas incorretas', () => {
      loginRateLimiter.registerFailedAttempt();
      loginRateLimiter.registerFailedAttempt();
      loginRateLimiter.registerFailedAttempt();
      loginRateLimiter.registerFailedAttempt();
      const finalAttempt = loginRateLimiter.registerFailedAttempt();

      expect(finalAttempt.locked).toBe(true);
      expect(finalAttempt.remainingSeconds).toBeGreaterThan(0);

      const status = loginRateLimiter.isLocked();
      expect(status.locked).toBe(true);
    });
  });
});

