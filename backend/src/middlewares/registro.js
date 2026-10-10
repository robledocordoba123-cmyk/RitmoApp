// Registro de peticiones (SEG-07, hallazgo H-02 · OWASP A09).
// Escribe una línea JSON por petición en la salida estándar, que Render guarda
// en sus logs. Las respuestas 401, 403 y 429 se marcan como eventos de
// seguridad para poder buscar intentos de acceso fallidos, accesos negados
// y bloqueos por fuerza bruta.
//
// Nunca se registra el cuerpo de la petición (contraseñas, tokens de
// recuperación), las cabeceras (el JWT) ni la cadena de consulta.

const ESTADOS_DE_SEGURIDAD = new Set([401, 403, 429]);

// La consulta de salud la hace el workflow que mantiene la demo encendida cada
// pocos minutos: registrarla solo llenaría los logs de ruido.
const RUTAS_SIN_REGISTRO = new Set(["/api/health"]);

function crearRegistroDePeticiones({ escribir = (linea) => console.log(linea) } = {}) {
  return (req, res, next) => {
    const ruta = req.originalUrl.split("?")[0];
    if (RUTAS_SIN_REGISTRO.has(ruta)) return next();

    const inicio = process.hrtime.bigint();
    res.on("finish", () => {
      const esDeSeguridad = ESTADOS_DE_SEGURIDAD.has(res.statusCode);
      const entrada = {
        fecha: new Date().toISOString(),
        nivel: res.statusCode >= 500 ? "error" : esDeSeguridad ? "advertencia" : "info",
        evento: esDeSeguridad ? "seguridad" : "peticion",
        metodo: req.method,
        ruta,
        estado: res.statusCode,
        ms: Number((process.hrtime.bigint() - inicio) / 1_000_000n),
        ip: req.ip,
        usuario: req.user?.id ?? null,
        rol: req.user?.rol ?? null,
        academia: req.user?.tenantId ?? null,
      };
      escribir(JSON.stringify(entrada));
    });
    next();
  };
}

// En las pruebas automatizadas no se registra nada: la suite hace cientos de
// peticiones y solo ensuciaría la salida.
const registroDePeticiones =
  process.env.NODE_ENV === "test" ? (req, res, next) => next() : crearRegistroDePeticiones();

module.exports = { crearRegistroDePeticiones, registroDePeticiones };
