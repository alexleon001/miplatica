-- ============================================
-- Mi Platica — Interés en ítems de proyección en cuotas
-- ============================================
-- Permite cargar un préstamo / compra en cuotas con su TNA % anual. Cuando
-- interest_rate está seteado, `amount` se interpreta como el CAPITAL a financiar
-- y la app calcula la cuota fija (sistema francés) client-side (lib/projection).
-- Si es null, `amount` sigue siendo el monto directo (comportamiento previo).
-- ============================================

alter table public.projection_items
  add column interest_rate numeric(6, 2)  -- TNA % anual; null = sin interés
    check (interest_rate is null or interest_rate >= 0);
