import { currentUser, jsonError, sanitizeNotes } from '../../../lib/account.js';

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await currentUser(request, env);
  if (!user) return jsonError('Not signed in.', 401);

  const row = await env.DB.prepare(
    'SELECT payload FROM saved_notes WHERE user_id = ?'
  ).bind(user.id).first();

  let notes = [];
  if (row && row.payload) {
    try {
      notes = sanitizeNotes(JSON.parse(row.payload));
    } catch {
      notes = [];
    }
  }

  return Response.json({ ok: true, notes }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await currentUser(request, env);
  if (!user) return jsonError('Not signed in.', 401);

  const body = await readBody(request);
  const notes = sanitizeNotes(body.notes);
  const payload = JSON.stringify(notes);

  if (payload.length > 20000) {
    return jsonError('Saved notes are too large.', 413);
  }

  await env.DB.prepare(`
    INSERT INTO saved_notes (user_id, payload, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `).bind(user.id, payload, new Date().toISOString()).run();

  return Response.json({ ok: true, count: notes.length }, { headers: { 'Cache-Control': 'no-store' } });
}
