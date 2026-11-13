import { Platform } from 'react-native';
import { setSecureItem, getSecureItem, deleteSecureItem, SECURE_KEYS } from './secureStorage';
import { generateSecureUUID, sha256Hash } from './cryptoService';

export interface SecureSession {
  sessionId: string;
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  fingerprint: string;
}

const SESSION_COOKIE_NAME = '__Host_scbus_sess';
const SESSION_DURATION_HOURS = 24 * 7; // 7 dias

/**
 * Cria e grava sessão de forma segura com flags de proteção de Cookies (SameSite=Strict, Secure) e Keychain
 */
export async function createSecureSession(userId: string, token: string): Promise<SecureSession> {
  const sessionId = generateSecureUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_DURATION_HOURS * 3600 * 1000;
  const fingerprint = await sha256Hash(`${sessionId}:${userId}:${createdAt}`);

  const session: SecureSession = {
    sessionId,
    token,
    userId,
    createdAt,
    expiresAt,
    fingerprint,
  };

  const serialized = JSON.stringify(session);

  // 1. Armazenamento seguro no Keystore/Keychain
  await setSecureItem(SECURE_KEYS.USER_SESSION, serialized);

  // 2. Gravação de Cookie Seguro para Web (SameSite=Strict, Secure)
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const expiresDate = new Date(expiresAt).toUTCString();
    // Em produção HTTPS, o prefixo __Host- garante Path=/ e Secure
    const cookieString = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; Expires=${expiresDate}; Path=/; SameSite=Strict; Secure`;
    try {
      document.cookie = cookieString;
    } catch {
      // Ignora erro em iframes com restrições
    }
  }

  return session;
}

/**
 * Recupera e valida a integridade da sessão ativa
 */
export async function getActiveSecureSession(): Promise<SecureSession | null> {
  try {
    const raw = await getSecureItem(SECURE_KEYS.USER_SESSION);
    if (!raw) return null;

    const session: SecureSession = JSON.parse(raw);

    // Valida expiração
    if (Date.now() > session.expiresAt) {
      await terminateSecureSession();
      return null;
    }

    // Valida integridade criptográfica
    const expectedFingerprint = await sha256Hash(
      `${session.sessionId}:${session.userId}:${session.createdAt}`
    );

    if (session.fingerprint !== expectedFingerprint) {
      console.warn('[SessionSecurity] Violação de integridade de sessão detectada.');
      await terminateSecureSession();
      return null;
    }

    return session;
  } catch (error) {
    console.warn('[SessionSecurity] Erro ao recuperar sessão:', error);
    return null;
  }
}

/**
 * Destrói sessão ativa e invalida cookies de forma segura
 */
export async function terminateSecureSession(): Promise<void> {
  await deleteSecureItem(SECURE_KEYS.USER_SESSION);
  await deleteSecureItem(SECURE_KEYS.AUTH_TOKEN);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
    } catch {
      // noop
    }
  }
}

