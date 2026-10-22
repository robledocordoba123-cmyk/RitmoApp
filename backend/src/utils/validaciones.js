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

// RF-17 · HU-17: cambios que el admin puede hacerle a un profesor o
// estudiante. Cada campo es opcional; si viene, tiene que ser válido.
// Devuelve el mensaje de error o null.
function errorEnCambiosDeUsuario({ nombre, email, activo }) {
  if (nombre !== undefined && (typeof nombre !== "string" || !nombre.trim())) {
    return "El nombre no puede quedar vacío.";
  }
  if (email !== undefined && (typeof email !== "string" || !email.includes("@"))) {
    return "El correo no es válido.";
  }
  if (activo !== undefined && typeof activo !== "boolean") {
    return "activo debe ser verdadero o falso.";
  }
  return null;
}

// RF-14: datos de una clase nueva. Devuelve { error } o { inicio, fin } ya
// convertidos a fecha.
const CAMPOS_DE_CLASE = ["ritmoId", "salonId", "profesorId", "fechaHoraInicio", "fechaHoraFin"];

function validarDatosDeClase(datos) {
  const completos = CAMPOS_DE_CLASE.every((campo) => Boolean(datos[campo]));
  if (!completos || !Number.isInteger(datos.cupoMaximo) || datos.cupoMaximo <= 0) {
    return { error: "Faltan datos o son inválidos para crear la clase." };
  }

  const inicio = new Date(datos.fechaHoraInicio);
  const fin = new Date(datos.fechaHoraFin);
  const fechasValidas = !Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime());
  if (!fechasValidas || inicio >= fin) {
    return { error: "El rango de fecha/hora de la clase no es válido." };
  }
  return { inicio, fin };
}

module.exports = { normalizarEmail, passwordValida, errorEnCambiosDeUsuario, validarDatosDeClase, LONGITUD_MINIMA_PASSWORD };
