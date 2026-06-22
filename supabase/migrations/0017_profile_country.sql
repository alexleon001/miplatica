-- ============================================
-- Mi Platica — profiles.country (soporte multi-país)
-- ============================================
-- Agrega el país del usuario al perfil. Habilita servir Venezuela (Bs/USD) con
-- el mismo binario y backend: el cliente lee `country` para decidir símbolo de
-- moneda, qué cotizaciones trae y qué instrumentos/features muestra.
--
-- Las columnas `_ars` existentes pasan a ser el "slot de moneda local" (ARS en
-- AR, VES en VE). No se migran datos: usuarios actuales quedan en 'AR'.
-- ============================================

alter table public.profiles
  add column country text not null default 'AR'
  check (country in ('AR', 'VE'));
