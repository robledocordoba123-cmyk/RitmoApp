const rateLimit = require("express-rate-limit");

// Mitiga ataques de fuerza bruta contra el login: máximo 10 intentos por IP
// cada 15 minutos. Solo cuentan los intentos fallidos, así que un usuario que
// entra bien no se gasta el cupo.
//
// Fuera de las pruebas los límites nunca se saltan. En las pruebas
// automatizadas sí, porque la suite hace cientos de logins desde la misma IP,
// salvo en la prueba que verifica el propio límite (cabecera X-Probar-Limite).
const saltarEnPruebas = (req) => process.env.NODE_ENV === "test" && !req.get("X-Probar-Limite");

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: saltarEnPruebas,
  message: { error: "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos." },
});

// El registro de academias es público: se limita para que nadie pueda crear
// miles de academias falsas con un script.
const limiteRegistro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: saltarEnPruebas,
  message: { error: "Demasiados registros desde esta conexión. Intenta más tarde." },
});

// Recuperar contraseña envía correos: se limita para que nadie pueda usar el
// formulario para llenar de correos la bandeja de otra persona.
const limiteRecuperacion = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: saltarEnPruebas,
  message: { error: "Demasiadas solicitudes de recuperación. Intenta de nuevo en 15 minutos." },
});

module.exports = { limiteLogin, limiteRegistro, limiteRecuperacion };
