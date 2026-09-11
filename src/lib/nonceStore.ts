/**
 * Server-side Nonce Store with automatic expiration & replay protection.
 * Nonces must originate from the backend, be stored server-side, and be consumed exactly once.
 */

interface NonceRecord {
  createdAt: number;
  consumed: boolean;
}

// In-memory server state for issued nonces
const nonceMap = new Map<string, NonceRecord>();
const NONCE_TTL_MS = 10 * 60 * 1000; // 10 minutes valid window

/**
 * Register a server-generated nonce.
 */
export function registerNonce(nonce: string): void {
  // Clean up expired nonces
  const now = Date.now();
  for (const [key, record] of nonceMap.entries()) {
    if (now - record.createdAt > NONCE_TTL_MS) {
      nonceMap.delete(key);
    }
  }

  nonceMap.set(nonce, {
    createdAt: now,
    consumed: false,
  });
}

/**
 * Check if a nonce is valid and has not been consumed yet.
 */
export function isValidNonce(nonce: string): boolean {
  const record = nonceMap.get(nonce);
  if (!record) return false;
  if (record.consumed) return false;
  if (Date.now() - record.createdAt > NONCE_TTL_MS) {
    nonceMap.delete(nonce);
    return false;
  }
  return true;
}

/**
 * Consume / Invalidate a nonce so it can NEVER be reused.
 */
export function invalidateNonce(nonce: string): void {
  const record = nonceMap.get(nonce);
  if (record) {
    record.consumed = true;
    nonceMap.delete(nonce);
  }
}
