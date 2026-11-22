import { currentUser } from '../../../lib/account.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const user = await currentUser(request, env);

  return Response.json({
    ok: Boolean(user),
    signedIn: Boolean(user),
    handle: user ? user.handle : null,
    storage: user ? 'cloud-sync-optional' : null
  }, { headers: { 'Cache-Control': 'no-store' } });
}
