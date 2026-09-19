/** Uniform 1–6 roll from Web Crypto. Rejection sampling avoids modulo bias. */
const UINT32_RANGE = 0x1_0000_0000;
const ACCEPT_BELOW = Math.floor(UINT32_RANGE / 6) * 6;

function secureUint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0];
}

/** Optional injected source is for deterministic tests; production uses Web Crypto. */
export function fairDie(nextUint32: () => number = secureUint32): number {
  let sample: number;
  do {
    sample = nextUint32();
    if (!Number.isInteger(sample) || sample < 0 || sample >= UINT32_RANGE) {
      throw new RangeError('The random source must return an unsigned 32-bit integer.');
    }
  } while (sample >= ACCEPT_BELOW);
  return (sample % 6) + 1;
}
