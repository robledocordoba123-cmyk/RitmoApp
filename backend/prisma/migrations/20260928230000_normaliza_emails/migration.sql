-- Los correos se guardan siempre en minúsculas y sin espacios (ver
-- src/utils/validaciones.js). Esta migración normaliza los que ya existían
-- para que esos usuarios puedan seguir iniciando sesión.
UPDATE "users" SET "email" = LOWER(TRIM("email")) WHERE "email" <> LOWER(TRIM("email"));
