// Optional free account layer helpers.
// No email, phone, or profile data. A workspace is a random handle + passphrase.
// Passphrases are hashed with PBKDF2; sessions are signed HMAC cookies.

export const SESSION_COOKIE = 'eduiq_session';
export const SESSION_DAYS = 30;
export const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

const encoder = new TextEncoder();
const ITERATIONS = 100000;

function base64UrlEncode(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  const padding = remainder === 0 ? '' : '='.repeat(4 - remainder);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomHandle() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let body = '';
  bytes.forEach((byte) => {
    body += alphabet[byte % alphabet.length];
  });
  return 'EIQ-' + body.slice(0, 4) + '-' + body.slice(4, 8);
}

export function normalizeHandle(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
}

export function validHandle(handle) {
  return /^[A-Z0-9][A-Z0-9-]{3,23}$/.test(handle || '');
}

export function validPassphrase(passphrase) {
  return typeof passphrase === 'string' && passphrase.length >= 10 && passphrase.length <= 200;
}

export function newSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function hashPassphrase(passphrase, salt) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: base64UrlDecode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );

  return base64UrlEncode(new Uint8Array(bits));
}

export function safeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function signPayload(payload, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSession(userId, secret, expiresAt = Date.now() + SESSION_SECONDS * 1000) {
  const payload = userId + '.' + expiresAt;
  const signature = await signPayload(payload, secret);
  return payload + '.' + signature;
}

export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  const userId = parts[0];
  const expiresAt = Number(parts[1]);
  const signature = parts[2];

  if (!userId || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;

  const expected = await signPayload(userId + '.' + expiresAt, secret);
  return safeEqual(signature, expected) ? userId : null;
}

export function readCookie(header, name) {
  if (!header) return null;
  const prefix = name + '=';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function sessionCookie(token, url) {
  const parts = [
    SESSION_COOKIE + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + SESSION_SECONDS
  ];
  if (url.protocol === 'https:') parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(url) {
  const parts = [SESSION_COOKIE + '=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (url.protocol === 'https:') parts.push('Secure');
  return parts.join('; ');
}

function cleanField(value, limit) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

export function sanitizeNotes(notes) {
  if (!Array.isArray(notes)) return [];
  const today = new Date().toISOString().slice(0, 10);

  return notes.slice(0, 8).map((note) => {
    const item = note && typeof note === 'object' ? note : {};
    const created = /^\d{4}-\d{2}-\d{2}$/.test(item.created) ? item.created : today;
    return {
      tool: cleanField(item.tool, 40),
      title: cleanField(item.title, 120),
      summary: cleanField(item.summary, 500),
      created
    };
  }).filter((note) => note.title || note.summary);
}

export async function currentUser(request, env) {
  if (!env.DB || !env.ACCOUNT_SESSION_SECRET) return null;
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const userId = await verifySession(token, env.ACCOUNT_SESSION_SECRET);
  if (!userId) return null;
  return env.DB.prepare('SELECT id, handle FROM users WHERE id = ?').bind(userId).first();
}

export function jsonError(message, status, extra = {}) {
  return Response.json({ error: message, ...extra }, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}
