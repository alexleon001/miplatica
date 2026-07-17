-- 0020_profile_usd_type_ve.sql
-- Bug multi-país encontrado al crear un usuario VE de prueba (s20): el check de
-- profiles.preferred_usd_type quedó con los dólares argentinos de 0001, así que
-- un usuario venezolano no podía guardar 'bcv'/'paralelo' (los RateKey de VE en
-- lib/countries.ts). Se amplía el check con los tipos de ambos países.

alter table public.profiles drop constraint profiles_preferred_usd_type_check;
alter table public.profiles add constraint profiles_preferred_usd_type_check
  check (preferred_usd_type = any (array['mep','blue','oficial','ccl','tarjeta','bcv','paralelo']));
