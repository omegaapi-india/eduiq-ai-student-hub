import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet as health } from '../functions/api/health.js';
import { onRequestGet as tools } from '../functions/api/tools.js';

test('health endpoint reports the local-first demo architecture', async () => {
  const response = await health();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'EduIQ');
  assert.equal(body.storage, 'local-first');
  assert.equal(body.optionalSync, 'free-cloud-d1-notes');
  assert.equal(body.payment, 'none');
  assert.equal(body.tools.length, 8);
});

test('tools endpoint lists public metadata only', async () => {
  const response = await tools();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.count, 8);
  assert.equal(body.tools[0].id, 'study');
  assert.ok(!JSON.stringify(body).match(/@|https?:/));
});
