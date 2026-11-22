import {
  createSession,
  hashPassphrase,
  jsonError,
  normalizeHandle,
  safeEqual,
  sessionCookie,
  validPassphrase
} from '../../../lib/account.js';

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

const INVALID = 'Invalid handle or passphrase.';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) return jsonError('Account storage is not configured.', 503);
  if (!env.ACCOUNT_SESSION_SECRET) return jsonError('Session signing is not configured.', 503);

  const body = await readBody(request);
  const handle = normalizeHandle(body.handle);
  const passphrase = typeof body.passphrase === 'string' ? body.passphrase : '';

  if (!handle || !validPassphrase(passphrase)) {
    return jsonError(INVALID, 401);
  }

  const user = await env.DB.prepare(
    'SELECT id, handle, salt, pass_hash FROM users WHERE handle = ?'
  ).bind(handle).first();

  if (!user) return jsonError(INVALID, 401);

  const attemptedHash = await hashPassphrase(passphrase, user.salt);
  if (!safeEqual(attemptedHash, user.pass_hash)) return jsonError(INVALID, 401);

  const token = await createSession(user.id, env.ACCOUNT_SESSION_SECRET);
  const response = Response.json({ ok: true, handle: user.handle });
  response.headers.append('Set-Cookie', sessionCookie(token, new URL(request.url)));
  return response;
}
