import crypto from 'crypto';

/**
 * Hashes a raw API key (e.g. "tk_live_finstack_999") using SHA-256.
 * The resulting 64-character hex string is what is stored in the database.
 */
export function hashApiKey(apiKey: string): string {
  if (!apiKey) return '';
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
