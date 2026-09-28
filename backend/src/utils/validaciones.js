// Reglas de datos de usuario que se repiten en el registro de academia, el
// login y el alta de profesores/estudiantes. Tenerlas en un solo lugar evita
// que un flujo exija algo que el otro no (antes el onboarding aceptaba
// contraseñas de cualquier longitud y el alta de usuarios pedía 8).

const LONGITUD_MINIMA_PASSWORD = 8;

// Los correos no distinguen mayúsculas: "Ana@Gmail.com" y "ana@gmail.com"
// son la misma persona y deben chocar con la restricción única.
function normalizarEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

function passwordValida(password) {
  return typeof password === "string" && password.length >= LONGITUD_MINIMA_PASSWORD;
}

module.exports = { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD };
