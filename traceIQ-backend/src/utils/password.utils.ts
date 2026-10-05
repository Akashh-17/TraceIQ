import bcrypt from 'bcrypt';

// The cost factor. 
// 10 means 2^10 rounds of hashing. This takes roughly 100ms per password.
// It is slow enough to stop hackers from guessing billions of passwords per second,
// but fast enough that a user logging in won't notice a delay.
const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password using bcrypt.
 * We use this when a user REGISTERS.
 */
export const hashPassword = async (password: string): Promise<string> => {
  // bcrypt.hash automatically generates the salt and mixes it with the password
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plain text password against a saved bcrypt hash.
 * We use this when a user LOGS IN.
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  // bcrypt.compare automatically extracts the salt from the hash string,
  // hashes the plain text password with that salt, and compares the results.
  return bcrypt.compare(password, hash);
};
