import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSession,
  hashPassphrase,
  newSalt,
  normalizeHandle,
  randomHandle,
  safeEqual,
  sanitizeNotes,
  validHandle,
  validPassphrase,
  verifySession,
  SESSION_SECONDS
} from '../lib/account.js';

import { onRequestPost as register } from '../functions/api/account/register.js';
import { onRequestGet as me } from '../functions/api/account/me.js';

const SECRET = 'account-test-secret-'.repeat(4);

test('handles are normalised and validated without personal data', () => {
  assert.equal(normalizeHandle('  eiq-ab_12! '), 'EIQ-AB12');
  assert.equal(validHandle('EIQ-ABCD-1234'), true);
  assert.equal(validHandle('me@example.com'), false);
  assert.equal(validHandle('abc'), false);
  assert.equal(validPassphrase('short'), false);
  assert.equal(validPassphrase('a-long-passphrase'), true);
  assert.match(randomHandle(), /^EIQ-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test('passphrase hashing is salted and deterministic', async () => {
  const salt = newSalt();
  const first = await hashPassphrase('correct horse battery', salt);
  const second = await hashPassphrase('correct horse battery', salt);
  const other = await hashPassphrase('correct horse battery', newSalt());

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.ok(safeEqual(first, second));
  assert.equal(safeEqual(first, other), false);
});

test('session tokens are signed, tamper-evident, and expire', async () => {
  const token = await createSession('user-123', SECRET);
  assert.equal(await verifySession(token, SECRET), 'user-123');

  const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
  assert.equal(await verifySession(tampered, SECRET), null);
  assert.equal(await verifySession(token, 'wrong-secret'), null);

  const expired = await createSession('user-123', SECRET, Date.now() - 1000);
  assert.equal(await verifySession(expired, SECRET), null);
  assert.equal(SESSION_SECONDS, 2592000);
});

test('saved notes are sanitised before cloud storage', () => {
  const notes = sanitizeNotes([
    { tool: 'ResumeIQ', title: 'A\u0000B', summary: 'x'.repeat(600), created: 'bad-date' },
    { tool: 'CampusIQ', title: 'Library', summary: 'Hall opens at 8 AM.' },
    'not-an-object'
  ]);

  assert.equal(notes.length, 2);
  assert.equal(notes[0].title, 'A B');
  assert.equal(notes[0].summary.length, 500);
  assert.match(notes[0].created, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(notes[1].tool, 'CampusIQ');
});

test('session status reports signed-out state without a console error', async () => {
  const request = new Request('https://example.com/api/account/me');
  const response = await me({ request, env: {} });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.signedIn, false);
  assert.equal(body.handle, null);
});

test('register route refuses to run without configured storage', async () => {
  const request = new Request('https://example.com/api/account/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle: 'EIQ-TEST-1234', passphrase: 'a-long-passphrase' })
  });

  const response = await register({ request, env: {} });
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /not configured/);
});
