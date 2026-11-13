import { supabaseService } from '../src/services/supabaseService';
import {
  SkeletonLoader,
  HomeCardSkeleton,
  TransactionSkeleton,
} from '../src/components/SkeletonLoader';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hashPassword, generateSessionToken, verifySessionToken } = require('../backend/server');

describe('Infraestrutura Cloud (Supabase + Vercel) e Protocolo Anti-Gravidade', () => {
  test('deve gerar e validar token HMAC-SHA256 de sessão bancária no backend', () => {
    const token = generateSessionToken('usr_12345', 'passageiro@smartcardbus.com.br');
    expect(token.startsWith('scbus.')).toBe(true);

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.sub).toBe('usr_12345');
    expect(decoded.email).toBe('passageiro@smartcardbus.com.br');

    // Token adulterado deve ser rejeitado imediatamente
    const tampered = `${token}x`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  test('deve gerar hash determinístico e seguro para senhas no backend', () => {
    const h1 = hashPassword('SenhaSegura@2026');
    const h2 = hashPassword('SenhaSegura@2026');
    const h3 = hashPassword('OutraSenha@2026');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1.length).toBe(64);
  });

  test('deve configurar credenciais do Supabase dinamicamente e validar estado', () => {
    supabaseService.setCredentials('', '');
    expect(supabaseService.isConfigured()).toBe(false);

    supabaseService.setCredentials(
      'https://smartcardbus.supabase.co/',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo'
    );
    expect(supabaseService.isConfigured()).toBe(true);
    expect(supabaseService.getConfig().url).toBe('https://smartcardbus.supabase.co');
  });

  test('deve exportar todos os componentes de Skeleton Loading do Protocolo Anti-Gravidade', () => {
    expect(typeof SkeletonLoader).toBe('function');
    expect(typeof HomeCardSkeleton).toBe('function');
    expect(typeof TransactionSkeleton).toBe('function');
  });
});

