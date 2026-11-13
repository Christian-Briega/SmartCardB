const crypto = require('crypto');

module.exports = {
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
  digestStringAsync: jest.fn(async (algorithm, str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
  }),
  randomUUID: jest.fn(() => crypto.randomUUID()),
  getRandomBytesAsync: jest.fn(async (size) => crypto.randomBytes(size)),
};

