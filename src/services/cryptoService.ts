import * as Crypto from 'expo-crypto';

/**
 * Generates a SHA-256 hash of the input string for payload verification and secure fingerprinting
 */
export async function sha256Hash(input: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

/**
 * Generates a secure random UUIDv4 for session tokens and transaction IDs
 */
export function generateSecureUUID(): string {
  return Crypto.randomUUID();
}

/**
 * Derives a biometric session key and encryption signature
 */
export async function deriveBiometricKey(userId: string, salt: string): Promise<string> {
  const combined = `smartcard_bus_bio:${userId}:${salt}`;
  return await sha256Hash(combined);
}

/**
 * Generates a mock bank-level JWT with signature for offline authentication
 */
export async function generateSecureJwt(payload: {
  userId: string;
  cpf: string;
  name: string;
  role: string;
}): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const body = btoa(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  const signature = await sha256Hash(`${header}.${body}.smartcard_master_secret_2026`);
  return `${header}.${body}.${signature.slice(0, 32)}`;
}

