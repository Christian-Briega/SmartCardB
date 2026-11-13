import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { mysqlApiService } from './mysqlApiService';

const STORAGE_PREFIX = 'smartcard_bus_sec_';

// Cache de sessão em memória associado ao Banco de Dados MySQL (sem uso de localStorage)
const memorySessionCache = new Map<string, string>();

/**
 * Checks if expo-secure-store is supported on the current device/runtime
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Salva um item de forma segura no Hardware Keystore/Keychain (mobile)
 * e persiste na tabela `user_sessions` do Banco de Dados MySQL via API Backend.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  const fullKey = `${STORAGE_PREFIX}${key}`;
  memorySessionCache.set(fullKey, value);

  // Persiste no banco de dados MySQL via API
  await mysqlApiService.setStorageItem(fullKey, value);

  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.setItemAsync(fullKey, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  } catch (error) {
    console.warn(`[SecureStore] Error writing key ${key}:`, error);
  }
}

/**
 * Recupera um item da tabela `user_sessions` do MySQL ou do Hardware Keystore/Keychain.
 */
export async function getSecureItem(key: string): Promise<string | null> {
  const fullKey = `${STORAGE_PREFIX}${key}`;

  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      const hardwareVal = await SecureStore.getItemAsync(fullKey);
      if (hardwareVal !== null) return hardwareVal;
    }
  } catch (error) {
    console.warn(`[SecureStore] Error reading key ${key}:`, error);
  }

  // Consulta no banco de dados MySQL via API
  const dbVal = await mysqlApiService.getStorageItem(fullKey);
  if (dbVal !== null) {
    memorySessionCache.set(fullKey, dbVal);
    return dbVal;
  }

  return memorySessionCache.get(fullKey) ?? null;
}

/**
 * Remove um item da tabela `user_sessions` do MySQL e do Hardware Keystore/Keychain.
 */
export async function deleteSecureItem(key: string): Promise<void> {
  const fullKey = `${STORAGE_PREFIX}${key}`;
  memorySessionCache.delete(fullKey);

  // Remove do banco de dados MySQL via API
  await mysqlApiService.deleteStorageItem(fullKey);

  try {
    const available = await isSecureStoreAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(fullKey);
    }
  } catch (error) {
    console.warn(`[SecureStore] Error deleting key ${key}:`, error);
  }
}

// Pre-defined security keys
export const SECURE_KEYS = {
  AUTH_TOKEN: 'auth_jwt_token',
  USER_SESSION: 'user_session_payload',
  BIOMETRIC_PUB_KEY: 'biometric_public_key_hash',
  SAVED_CPF: 'saved_user_cpf_encrypted',
  DEVICE_FINGERPRINT: 'device_hardware_fingerprint',
};
