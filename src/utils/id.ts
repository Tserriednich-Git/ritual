const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomSegment(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Sortable, collision-resistant-enough identifier for local rows.
 *
 * Not cryptographic: these ids only ever address records inside one device's
 * sandbox, so `Math.random` is adequate and avoids pulling in `expo-crypto`.
 * The timestamp prefix keeps rows roughly ordered by creation.
 */
export function createId(): string {
  return `${Date.now().toString(36)}-${randomSegment(10)}`;
}
