import { clearSessionCookie } from '../../../lib/account.js';

export async function onRequestPost(context) {
  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', clearSessionCookie(new URL(context.request.url)));
  return response;
}
