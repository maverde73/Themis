/**
 * Shamir's Secret Sharing over GF(256).
 * Splits a secret into N shares with threshold T.
 * Outputs shares as hex strings.
 */

import { WORDLIST } from "./wordlist";

// GF(256) arithmetic using AES irreducible polynomial x^8 + x^4 + x^3 + x + 1
const EXP = new Uint8Array(255);
const LOG = new Uint8Array(256);

(function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11b;
  }
})();

function gf256Mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function gf256Div(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero in GF(256)");
  if (a === 0) return 0;
  return EXP[(LOG[a] - LOG[b] + 255) % 255];
}

function evaluatePolynomial(coeffs: Uint8Array, x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = gf256Mul(result, x) ^ coeffs[i];
  }
  return result;
}

export interface ShamirShare {
  index: number; // 1-based share index
  data: string; // hex-encoded share bytes
}

/**
 * Split a secret into `n` shares with threshold `t`.
 * Any `t` shares can reconstruct the secret.
 */
export function split(secret: Uint8Array, n: number, t: number): ShamirShare[] {
  if (t > n) throw new Error("Threshold cannot exceed total shares");
  if (t < 1) throw new Error("Threshold must be at least 1");
  if (n > 254) throw new Error("Max 254 shares");

  // Threshold 1 = no splitting, each share is the full secret
  if (t === 1) {
    const hex = Array.from(secret).map((b) => b.toString(16).padStart(2, "0")).join("");
    return Array.from({ length: n }, (_, i) => ({ index: i + 1, data: hex }));
  }

  const shares: ShamirShare[] = [];

  for (let i = 0; i < n; i++) {
    shares.push({ index: i + 1, data: "" });
  }

  // For each byte of the secret, create a random polynomial and evaluate at each share index
  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    // Coefficients: a[0] = secret byte, a[1..t-1] = random
    const coeffs = new Uint8Array(t);
    coeffs[0] = secret[byteIdx];
    crypto.getRandomValues(coeffs.subarray(1));

    for (let i = 0; i < n; i++) {
      const val = evaluatePolynomial(coeffs, i + 1);
      shares[i].data += val.toString(16).padStart(2, "0");
    }
  }

  return shares;
}

/**
 * Reconstruct the secret from `t` or more shares.
 */
export function combine(shares: ShamirShare[]): Uint8Array {
  if (shares.length < 1) throw new Error("Need at least 1 share");

  // Single share = direct decode (threshold was 1)
  if (shares.length === 1) {
    const hex = shares[0].data;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  const secretLen = shares[0].data.length / 2;
  const secret = new Uint8Array(secretLen);

  for (let byteIdx = 0; byteIdx < secretLen; byteIdx++) {
    const points: Array<{ x: number; y: number }> = shares.map((s) => ({
      x: s.index,
      y: parseInt(s.data.slice(byteIdx * 2, byteIdx * 2 + 2), 16),
    }));

    // Lagrange interpolation at x=0
    let result = 0;
    for (let i = 0; i < points.length; i++) {
      let num = 1;
      let den = 1;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        num = gf256Mul(num, points[j].x);
        den = gf256Mul(den, points[i].x ^ points[j].x);
      }
      const lagrange = gf256Div(num, den);
      result ^= gf256Mul(points[i].y, lagrange);
    }
    secret[byteIdx] = result;
  }

  return secret;
}

/**
 * Encode a share as mnemonic words.
 * Format: "parte-N parola1 parola2 parola3 ..."
 * Each byte of the share maps to one word from the 256-word list.
 */
export function shareToWords(share: ShamirShare): string {
  const words: string[] = [];
  for (let i = 0; i < share.data.length; i += 2) {
    const byte = parseInt(share.data.slice(i, i + 2), 16);
    words.push(WORDLIST[byte]);
  }
  return words.join(" ");
}

/**
 * Decode a share from its mnemonic word representation.
 */
export function wordsToShare(encoded: string): ShamirShare {
  const words = encoded.trim().split(/\s+/);
  if (words.length < 1) throw new Error("Invalid share format");

  // Strip optional "parte-N" prefix for backward compat
  let startIdx = 0;
  if (words[0].match(/^parte-\d+$/)) {
    startIdx = 1;
  }

  const wordToIndex = new Map<string, number>();
  for (let i = 0; i < WORDLIST.length; i++) {
    wordToIndex.set(WORDLIST[i], i);
  }

  let hex = "";
  for (let i = startIdx; i < words.length; i++) {
    const word = words[i].toLowerCase();
    const byteVal = wordToIndex.get(word);
    if (byteVal === undefined) throw new Error(`Unknown word: "${word}"`);
    hex += byteVal.toString(16).padStart(2, "0");
  }

  return { index: 1, data: hex };
}
