/**
 * Production-grade Web Crypto API E2EE (End-to-End Encryption) Engine
 * Implements ECDH (Curve P-256) key exchange, AES-256-GCM authenticated cipher,
 * SHA-256 Safety Number generation, and Passphrase-derived Key Backup.
 */

// ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate new ECDH KeyPair for user
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

// Export CryptoKey to JWK string
export async function exportKeyToJwk(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

// Import CryptoKey from JWK string
export async function importPublicKeyFromJwk(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

export async function importPrivateKeyFromJwk(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// Cache for derived pairwise AES-GCM keys to prevent redundant derivations
const derivedKeyCache = new Map<string, CryptoKey>();

// Derive 256-bit AES-GCM symmetric key between local private key and remote public key
export async function deriveSharedAesKey(
  localPrivateKey: CryptoKey,
  remotePublicKey: CryptoKey,
  cacheKey?: string
): Promise<CryptoKey> {
  if (cacheKey && derivedKeyCache.has(cacheKey)) {
    return derivedKeyCache.get(cacheKey)!;
  }

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: remotePublicKey,
    },
    localPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );

  if (cacheKey) {
    derivedKeyCache.set(cacheKey, aesKey);
  }

  return aesKey;
}

// Generate random AES-256-GCM symmetric key (e.g. for group chats)
export async function generateGroupMasterKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext with AES-GCM 256
export async function encryptPayload(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit random IV for AES-GCM

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

// Decrypt ciphertext with AES-GCM 256
export async function decryptPayload(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBytes = base64ToBuffer(ciphertextBase64);
  const iv = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encryptedBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// Calculate 60-digit Safety Number (Like Signal/WhatsApp) between 2 public keys
export async function generateSafetyNumber(
  pubKeyJwk1: string,
  pubKeyJwk2: string
): Promise<{ safetyNumber: string; qrPayload: string }> {
  // Sort keys alphabetically so both users calculate the exact same safety number
  const sorted = [pubKeyJwk1, pubKeyJwk2].sort();
  const encoder = new TextEncoder();
  const combinedData = encoder.encode(sorted.join(':::'));

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert hash to numerical digits
  let digits = '';
  for (let i = 0; i < hashArray.length; i++) {
    const val = (hashArray[i] * 397 + i * 17) % 100000;
    digits += val.toString().padStart(5, '0');
  }

  // Format into 12 groups of 5 digits = 60 digits
  const blocks: string[] = [];
  for (let i = 0; i < 12; i++) {
    blocks.push(digits.substring(i * 5, (i + 1) * 5) || '12345');
  }

  const formattedSafetyNumber = blocks.join(' ');
  const qrPayload = `CIPHER_E2EE_VERIFY:${bufferToBase64(hashBuffer).substring(0, 32)}`;

  return {
    safetyNumber: formattedSafetyNumber,
    qrPayload,
  };
}

// Encrypt Key Backup with user master passphrase using PBKDF2 + AES-GCM
export async function exportEncryptedKeyBackup(
  privateKeyJwk: string,
  publicKeyJwk: string,
  username: string,
  passphrase: string
): Promise<string> {
  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Derive master key from passphrase
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedAesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const payload = JSON.stringify({
    username,
    privateKeyJwk,
    publicKeyJwk,
    version: '1.0',
    exportedAt: new Date().toISOString(),
  });

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    derivedAesKey,
    encoder.encode(payload)
  );

  const backupObject = {
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256-100k',
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    data: bufferToBase64(encryptedData),
  };

  return JSON.stringify(backupObject, null, 2);
}

// Decrypt Key Backup with user master passphrase
export async function importEncryptedKeyBackup(
  backupJson: string,
  passphrase: string
): Promise<{ username: string; privateKeyJwk: string; publicKeyJwk: string }> {
  const backup = JSON.parse(backupJson);
  const salt = base64ToBuffer(backup.salt);
  const iv = base64ToBuffer(backup.iv);
  const encryptedBytes = base64ToBuffer(backup.data);

  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedAesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    derivedAesKey,
    encryptedBytes
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr);
}
