/**
 * 🔐 Gerador TOTP Standalone
 * Uso:
 *   node scripts/generate-totp.js
 *
 * Requer:
 *   SECRET_TOTP no .env
 */

require('dotenv').config();
const crypto = require('crypto');

/**
 * Converte Base32 para Buffer
 */
function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output = [];

  base32 = base32.replace(/=+$/, '').toUpperCase();

  for (const char of base32) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
      throw new Error('SECRET_TOTP inválido (Base32)');
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * 🔢 Gera código TOTP
 */
function generateTOTP(secretBase32, step = 30, digits = 6) {
  const key = base32ToBuffer(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / step);

  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

// ================= EXECUÇÃO =================

const secret = process.env.SECRET_TOTP;

if (!secret) {
  console.error('❌ SECRET_TOTP não encontrado no .env');
  process.exit(1);
}

const token = generateTOTP(secret);

console.log('🔐 TOTP atual:', token);
console.log('⏳ Válido por ~30 segundos');
