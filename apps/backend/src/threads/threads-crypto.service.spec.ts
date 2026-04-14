import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThreadsCryptoService } from './threads-crypto.service';

// 32-byte key (64 hex chars) for AES-256
const TEST_KEY_HEX =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue(TEST_KEY_HEX),
};

describe('ThreadsCryptoService', () => {
  let service: ThreadsCryptoService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ThreadsCryptoService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(ThreadsCryptoService);
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('returns a base64 string', () => {
      const result = service.encrypt('hello world');

      expect(typeof result).toBe('string');
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
      // Verify it is valid base64 by round-tripping
      expect(Buffer.from(result, 'base64').toString('base64')).toBe(result);
    });

    it('produces different output each time due to random IV', () => {
      const plaintext = 'same input every time';

      const result1 = service.encrypt(plaintext);
      const result2 = service.encrypt(plaintext);

      expect(result1).not.toBe(result2);
    });
  });

  describe('decrypt', () => {
    it('returns the original plaintext after encrypt + decrypt', () => {
      const plaintext = 'my secret token 12345';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('handles empty string plaintext', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('handles unicode plaintext', () => {
      const plaintext = 'token-with-unicode-\u{1F680}-\u{2728}';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('throws when ciphertext is tampered with', () => {
      const encrypted = service.encrypt('secret data');
      const buf = Buffer.from(encrypted, 'base64');

      // Flip a byte in the ciphertext portion (after IV + authTag = 32 bytes)
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString('base64');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('throws when auth tag is tampered with', () => {
      const encrypted = service.encrypt('secret data');
      const buf = Buffer.from(encrypted, 'base64');

      // Flip a byte in the auth tag portion (bytes 16-31)
      buf[20] ^= 0xff;
      const tampered = buf.toString('base64');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('throws when input is not valid base64 encoded ciphertext', () => {
      expect(() => service.decrypt('not-a-real-ciphertext')).toThrow();
    });
  });

  describe('constructor', () => {
    it('reads encryption key from config via getOrThrow', async () => {
      const configMock = {
        getOrThrow: jest.fn().mockReturnValue(TEST_KEY_HEX),
      };

      const module = await Test.createTestingModule({
        providers: [
          ThreadsCryptoService,
          { provide: ConfigService, useValue: configMock },
        ],
      }).compile();

      module.get(ThreadsCryptoService);

      expect(configMock.getOrThrow).toHaveBeenCalledWith(
        'THREADS_TOKEN_ENCRYPTION_KEY',
      );
    });
  });
});
