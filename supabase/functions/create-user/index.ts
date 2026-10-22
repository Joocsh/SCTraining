// ════════════════════════════════════════════════════════════════════
// Skill Cloud Academy · create-user (Supabase Edge Function)
//
// Public sign up is off: only admins and coaches create accounts, from
// their panels. This function runs on Supabase with the service role,
// which never reaches the browser.
//
//   coach   creates associates only; each one joins the coach's team
//   admin   creates associates, coaches or admins, and can put a new
//           associate on a coach's team
//
// Body: { full_name, email, password, app_role?, coach_id? }
// The caller's own session (Authorization: Bearer <access token>) says
// who is asking. Deploy with "Verify JWT" off: the function checks the
// token itself.
// ════════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ROLES = ['associate', 'coach', 'admin'];

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
    return reply({ error: 'Only admins and coaches can create accounts.' }, 403);
  }

  // what they ask for
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: 'Bad request.' }, 400); }
  const fullName = String(body.full_name ?? '').trim().replace(/\s+/g, ' ');
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = me.app_role === 'admin' ? String(body.app_role ?? 'associate') : 'associate';
  let coachId: string | null = me.app_role === 'coach' ? me.id : (body.coach_id ? String(body.coach_id) : null);

  if (fullName.length < 2) return reply({ error: 'Type the full name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Type a valid email.' }, 400);
  if (password.length < 8) return reply({ error: 'The password needs at least 8 characters.' }, 400);
  if (!ROLES.includes(role)) return reply({ error: 'Unknown role.' }, 400);
  if (role !== 'associate') coachId = null;
  if (coachId && coachId !== me.id) {
    const { data: coach } = await db.from('profiles').select('app_role').eq('id', coachId).single();
    if (!coach || coach.app_role !== 'coach') return reply({ error: 'That coach does not exist.' }, 400);
  }

  // the account (the profile row comes from the handle_new_user trigger)
  const { data: created, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName },
  });
  if (error || !created?.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? '');
    return reply({ error: taken ? 'An account with this email already exists.' : (error?.message ?? 'Could not create the account.') }, 400);
  }
  const id = created.user.id;

  const steps = [db.from('profiles').update({ created_by: me.id, ...(role !== 'associate' ? { app_role: role } : {}) }).eq('id', id)];
  if (coachId) steps.push(db.from('coach_assignments').insert({ coach_id: coachId, associate_id: id }));
  for (const step of steps) {
    const { error: stepError } = await step;
    if (stepError) {
      await db.auth.admin.deleteUser(id);   // all or nothing
      return reply({ error: 'Could not finish the account: ' + stepError.message }, 500);
    }
  }
  return reply({ id, email, full_name: fullName, app_role: role, coach_id: coachId });
});
