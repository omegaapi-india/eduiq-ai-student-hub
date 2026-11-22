import {
  hashPassphrase,
  jsonError,
  newSalt,
  normalizeHandle,
  sessionCookie,
  validHandle,
  validPassphrase,
  createSession
} from '../../../lib/account.js';

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DB) return jsonError('Account storage is not configured.', 503);
  if (!env.ACCOUNT_SESSION_SECRET) return jsonError('Session signing is not configured.', 503);

  const body = await readBody(request);
  const handle = normalizeHandle(body.handle);
  const passphrase = typeof body.passphrase === 'string' ? body.passphrase : '';

  if (!validHandle(handle)) {
    return jsonError('Use a handle with 4 to 24 letters, numbers, or hyphens.', 400);
  }
  if (!validPassphrase(passphrase)) {
    return jsonError('Use a passphrase with at least 10 characters.', 400);
  }

  const id = crypto.randomUUID();
  const salt = newSalt();
  const passHash = await hashPassphrase(passphrase, salt);
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO users (id, handle, salt, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, handle, salt, passHash, createdAt).run();
  } catch (error) {
    if (/UNIQUE/i.test(String(error && error.message))) {
      return jsonError('That handle is already taken. Try another one.', 409);
    }
    return jsonError('Could not create the workspace right now.', 500);
  }

  const token = await createSession(id, env.ACCOUNT_SESSION_SECRET);
  const response = Response.json({ ok: true, handle });
  response.headers.append('Set-Cookie', sessionCookie(token, new URL(request.url)));
  return response;
}
