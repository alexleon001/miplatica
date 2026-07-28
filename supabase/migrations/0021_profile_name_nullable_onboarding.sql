-- ============================================
-- 0021_profile_name_nullable_onboarding
-- ============================================
-- Aplicada en prod el 2026-07-23; el archivo se agrega al repo el 2026-07-28
-- (quedó sin versionar). El cuerpo es exactamente el que corre hoy en la base.
--
-- Problema: el trigger de alta rellenaba `profiles.name` con
-- split_part(email, '@', 1) → todo usuario nuevo nacía "con nombre", el gate de
-- onboarding (`profile.name is null`) nunca se disparaba y la app terminaba
-- llamando al usuario por el prefijo de su email.
--
-- Fix: dejar `name` en NULL salvo que venga en la metadata del signup. El
-- onboarding (que ya pide país + nombre) vuelve a aparecer.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(new.raw_user_meta_data->>'name', ''));

  -- Modelo híbrido de gastos compartidos: al crearse la cuenta, los miembros
  -- "fantasma" invitados con este email pasan a ser este usuario.
  if new.email is not null then
    update public.group_members m
      set user_id = new.id, status = 'active', joined_at = coalesce(m.joined_at, now())
      where m.user_id is null and m.email is not null and lower(m.email) = lower(new.email);
  end if;

  return new;
end;
$function$;
