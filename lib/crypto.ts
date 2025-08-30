// lib/crypto.ts
import crypto from "crypto";

const KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!KEY || KEY.length !== 32) {
  throw new Error("TOKEN_ENCRYPTION_KEY must be set and 32 characters long");
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  // store iv + encrypted as base64
  return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(enc: string): string {
  const [ivB64, encryptedB64] = enc.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
