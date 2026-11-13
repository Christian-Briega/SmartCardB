import {
  sha256Hash,
  generateSecureUUID,
  deriveBiometricKey,
  generateSecureJwt,
} from '../src/services/cryptoService';
import {
  setSecureItem,
  getSecureItem,
  deleteSecureItem,
  SECURE_KEYS,
} from '../src/services/secureStorage';
import { validateSecurityConnection } from '../src/services/secureNetwork';

describe('Protocolo Anti-Gravidade - Criptografia e Segurança Bancária', () => {
  describe('CryptoService', () => {
    it('deve gerar hash SHA-256 consistente e determinístico', async () => {
      const hash1 = await sha256Hash('smartcard_secret_pass');
      const hash2 = await sha256Hash('smartcard_secret_pass');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // 256 bits = 64 hex chars
    });

    it('deve gerar UUID v4 seguro', () => {
      const uuid1 = generateSecureUUID();
      const uuid2 = generateSecureUUID();
      expect(uuid1).toBeDefined();
      expect(uuid2).toBeDefined();
      expect(uuid1).not.toBe(uuid2);
    });

    it('deve derivar chave biométrica vinculada ao usuário', async () => {
      const bioKey = await deriveBiometricKey('123.456.789-00', 'salt-device-987');
      expect(bioKey).toBeDefined();
      expect(typeof bioKey).toBe('string');
      expect(bioKey.length).toBe(64);
    });

    it('deve gerar JWT assinado para autenticação bancária', async () => {
      const jwt = await generateSecureJwt({
        userId: 'user-01',
        cpf: '123.456.789-00',
        name: 'Carlos Silva',
        role: 'passenger',
      });
      const parts = jwt.split('.');
      expect(parts.length).toBe(3); // header, payload, signature
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBe(32);
    });
  });

  describe('SecureStorage Service (Keychain / Keystore)', () => {
    it('deve salvar, recuperar e deletar token seguro', async () => {
      await setSecureItem(SECURE_KEYS.AUTH_TOKEN, 'jwt_token_bancario_123');
      const retrieved = await getSecureItem(SECURE_KEYS.AUTH_TOKEN);
      expect(retrieved).toBe('jwt_token_bancario_123');

      await deleteSecureItem(SECURE_KEYS.AUTH_TOKEN);
      const afterDelete = await getSecureItem(SECURE_KEYS.AUTH_TOKEN);
      expect(afterDelete).toBeNull();
    });
  });

  describe('SSL Pinning e Validação de Rede', () => {
    it('deve aceitar conexões HTTPS válidas', async () => {
      const result = await validateSecurityConnection('https://api.smartcardbus.com.br/cards');
      expect(result.secure).toBe(true);
    });

    it('deve rejeitar conexões HTTP inseguras contra ataques MitM', async () => {
      const result = await validateSecurityConnection('http://api.smartcardbus.com.br/cards');
      expect(result.secure).toBe(false);
      expect(result.reason).toContain('HTTPS');
    });
  });
});

