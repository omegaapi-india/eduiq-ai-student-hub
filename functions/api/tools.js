import { TOOLS } from '../../lib/engines.js';

export async function onRequestGet() {
  return Response.json({
    count: TOOLS.length,
    tools: TOOLS.map((tool) => ({
      id: tool.id,
      name: tool.name,
      mark: tool.mark,
      tag: tool.tag,
      description: tool.description
    }))
  });
}
