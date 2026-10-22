-- ════════════════════════════════════════════════════════════════════
-- Skill Cloud Academy · a password someone else chose must be replaced
-- Run after 0015_people_directory.sql.
--
--   When an admin or a coach creates an account or sets someone's password
--   (create-user, manage-user), must_change_password is turned on. The
--   site then asks the person to choose their own before anything else.
--   The flag turns off by itself when the password really changes: a
--   trigger on auth.users, so nobody can clear it any other way.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles add column must_change_password boolean not null default false;

-- accounts that staff created so far still use the password they were given
update public.profiles set must_change_password = true where created_by is not null;

create or replace function private.password_changed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.profiles set must_change_password = false where id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.password_changed() from public, anon, authenticated;

create trigger on_auth_password_changed
  after update of encrypted_password on auth.users
  for each row execute function private.password_changed();
