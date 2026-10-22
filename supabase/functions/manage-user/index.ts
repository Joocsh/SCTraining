// ════════════════════════════════════════════════════════════════════
// Skill Cloud Academy · manage-user (Supabase Edge Function)
//
// What Settings > Users does to an existing account, with the service
// role, which never reaches the browser.
//
//   set_password   admin: anyone. coach: the associates on their team.
//                  The person must choose their own at the next sign in.
//   deactivate     admin only, never their own account. The person can
//                  no longer sign in; nothing they did is deleted.
//   reactivate     admin only.
//
// Body: { action, user_id, password? }
// Deploy with "Verify JWT" off: the function checks the caller's token.
// ════════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// The project's secret key (Supabase sets it for every function), or the
// legacy service role key on projects that still use it.
function serverKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const first = keys.default || Object.values(keys)[0];
    if (first) return String(first);
  } catch { /* fall back below */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serverKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // who is asking
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who, error: whoError } = await db.auth.getUser(token);
  if (whoError || !who?.user) return reply({ error: 'Your session expired. Sign in again.' }, 401);
  const { data: me } = await db.from('profiles').select('id, app_role').eq('id', who.user.id).single();
  if (!me || (me.app_role !== 'admin' && me.app_role !== 'coach')) {
    return reply({ error: 'Only admins and coaches manage accounts.' }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: 'Bad request.' }, 400); }
  const action = String(body.action ?? '');
  const userId = String(body.user_id ?? '');
  const { data: target } = await db.from('profiles').select('id, full_name, app_role').eq('id', userId).single();
  if (!target) return reply({ error: 'That account does not exist.' }, 404);

  // who may do what
  if (me.app_role === 'coach') {
    if (action !== 'set_password') return reply({ error: 'Only admins can do that.' }, 403);
    const { data: link } = await db.from('coach_assignments').select('associate_id')
      .eq('coach_id', me.id).eq('associate_id', userId).maybeSingle();
    if (!link) return reply({ error: 'You can only manage the associates on your team.' }, 403);
  }
  if ((action === 'deactivate' || action === 'reactivate') && userId === me.id) {
    return reply({ error: 'You cannot deactivate your own account.' }, 400);
  }

  let change: Record<string, unknown>;
  if (action === 'set_password') {
    const password = String(body.password ?? '');
    if (password.length < 8) return reply({ error: 'The password needs at least 8 characters.' }, 400);
    change = { password };
  } else if (action === 'deactivate') {
    change = { ban_duration: '876000h' };   // about 100 years: until an admin reactivates it
  } else if (action === 'reactivate') {
    change = { ban_duration: 'none' };
  } else {
    return reply({ error: 'Unknown action.' }, 400);
  }

  const { error } = await db.auth.admin.updateUserById(userId, change);
  if (error) return reply({ error: error.message }, 400);
  // after the password update: its trigger turns the flag off, this turns it back on
  if (action === 'set_password' && userId !== me.id) {
    const { error: flagError } = await db.from('profiles').update({ must_change_password: true }).eq('id', userId);
    if (flagError) return reply({ error: 'The password changed, but: ' + flagError.message }, 500);
  }
  return reply({ ok: true, action, user_id: userId, full_name: target.full_name });
});
