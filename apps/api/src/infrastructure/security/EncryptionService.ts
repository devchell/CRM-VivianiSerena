import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { apiEnv } from '../../lib/env'

const ALGORITHM = 'aes-256-gcm'
const KEY_LEN   = 32  // 256-bit
const IV_LEN    = 12  // 96-bit (recommended for GCM)
const BCRYPT_ROUNDS = 12

function deriveKey(): Buffer {
  const raw = apiEnv.encryptionKey
  if (!raw || raw.length < 32) {
    throw new Error('ENCRYPTION_KEY env var must be at least 32 characters')
  }
  // PBKDF2 to always get exactly 32 bytes from the env key
  return crypto.pbkdf2Sync(raw, 'viviani-salt', 100_000, KEY_LEN, 'sha256')
}

export class EncryptionService {
  /**
   * AES-256-GCM encryption for sensitive data at rest (OAuth tokens, secrets).
   * Output format: `<ivHex>:<authTagHex>:<ciphertextHex>`
   */
  static encrypt(plaintext: string): string {
    const key = deriveKey()
    const iv  = crypto.randomBytes(IV_LEN)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
  }

  static decrypt(token: string): string {
    const parts = token.split(':')
    if (parts.length !== 3) throw new Error('Invalid encrypted token format')
    const [ivHex, tagHex, encHex] = parts
    const key = deriveKey()
    const iv  = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(enc).toString('utf8') + decipher.final('utf8')
  }

  /** bcrypt hash with rounds=12 */
  static hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  static verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * One-way SHA-256 hash for LGPD anonymization (email, phone).
   * Output is a 16-char hex prefix — irreversible.
   */
  static anonymize(value: string): string {
    const salt = apiEnv.anonymizationSalt
    return crypto.createHash('sha256').update(value + salt).digest('hex').substring(0, 16)
  }

  /** Cryptographically secure random hex token */
  static randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex')
  }
}
