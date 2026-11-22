import { TOOLS } from '../../lib/engines.js';

export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: 'EduIQ',
    mode: 'browser-local-deterministic-analysis',
    storage: 'local-first',
    optionalSync: 'free-cloud-d1-notes',
    payment: 'none',
    tools: TOOLS.map((tool) => tool.id)
  });
}
