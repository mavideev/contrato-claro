-- Planes de suscripción iniciales (spec 06). Precios de ejemplo validados por
-- la usuaria para arrancar; se ajustan con un UPDATE cuando /admin tenga
-- datos reales de costo por página.
insert into plans (code, name, description, price_cents, page_quota, featured, active) values
  ('basico', 'Básico', 'Para quien alquila su casa', 499000, 50, false, true),
  ('profesional', 'Profesional', 'Para quien alquila varias propiedades', 1199000, 150, true, true),
  ('estudio', 'Estudio', 'Para inmobiliarias', 2999000, 400, false, true)
on conflict (code) do nothing;
