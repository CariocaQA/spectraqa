// AES-256-GCM encryption utilities for secure token storage

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

// Derive a CryptoKey from the secret
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("spectra-salt-v1"), // Fixed salt for deterministic key derivation
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a plaintext string
export async function encryptToken(plaintext: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await deriveKey(secret);
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(plaintext)
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Return as base64 with prefix to identify encrypted data
  return "aes256gcm:" + btoa(String.fromCharCode(...combined));
}

// Decrypt an encrypted string
export async function decryptToken(encrypted: string, secret: string): Promise<string> {
  // Check if it's using new encryption format
  if (encrypted.startsWith("aes256gcm:")) {
    const base64Data = encrypted.slice("aes256gcm:".length);
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    
    const key = await deriveKey(secret);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  }
  
  // Fallback: assume it's old base64-encoded data (for backward compatibility)
  try {
    return atob(encrypted);
  } catch {
    throw new Error("Invalid encrypted token format");
  }
}
