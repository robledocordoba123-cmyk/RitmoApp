// RF-23 · HU-24: el administrador le hace una pregunta en lenguaje natural al
// asistente de IA y recibe una respuesta con datos de su academia (ADR-004).
//
// El asistente solo existe si se configura ANTHROPIC_API_KEY: sin clave, la
// app funciona igual y la pantalla avisa que el asistente no está activo.
const Anthropic = require("@anthropic-ai/sdk");
const { crearAsistente, ErrorDelAsistente } = require("../utils/asistente/asistente");

const LARGO_MAXIMO = 500;
let asistente = null;
let clienteDePrueba = null;

// Las pruebas automáticas inyectan un cliente simulado: así no se llama a la
// API real, no se gasta dinero y se controla lo que "responde" el modelo.
function usarClienteDePrueba(cliente) {
  clienteDePrueba = cliente;
  asistente = null;
}

function asistenteActual() {
  if (clienteDePrueba) return asistente || (asistente = crearAsistente(clienteDePrueba));
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!asistente) asistente = crearAsistente(new Anthropic());
  return asistente;
}

function estado(req, res) {
  res.json({ disponible: asistenteActual() !== null });
}

// Errores del proveedor de IA que tienen un mensaje claro para el usuario.
// Nunca se muestra la clave, la respuesta cruda ni el error interno.
const ERRORES_DEL_PROVEEDOR = [
  [(err) => err instanceof Anthropic.RateLimitError, 429, "El asistente está recibiendo muchas preguntas. Intenta en un minuto."],
  [
    (err) => err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError,
    503,
    "El asistente no está bien configurado. Avísale al equipo técnico.",
  ],
  [
    (err) => err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.APIError,
    503,
    "El asistente no está disponible en este momento. Intenta más tarde.",
  ],
];

// Traduce un error a { estado, cuerpo } para responder, o null si no se
// conoce (en ese caso el error sigue hacia el manejador general).
function respuestaParaElError(err) {
  if (err instanceof ErrorDelAsistente) {
    return { estado: 422, cuerpo: { error: err.message, codigo: err.codigo } };
  }
  // Se registra el detalle en el servidor, pero al usuario solo se le da un mensaje claro.
  console.error(JSON.stringify({ fecha: new Date().toISOString(), nivel: "error", evento: "asistente", tipo: err.constructor?.name, estado: err.status, error: err.message }));
  const conocido = ERRORES_DEL_PROVEEDOR.find(([coincide]) => coincide(err));
  return conocido ? { estado: conocido[1], cuerpo: { error: conocido[2] } } : null;
}

function leerPregunta(cuerpo) {
  return typeof cuerpo?.pregunta === "string" ? cuerpo.pregunta.trim() : "";
}

async function preguntar(req, res) {
  const pregunta = leerPregunta(req.body);
  if (pregunta.length < 3 || pregunta.length > LARGO_MAXIMO) {
    return res.status(400).json({ error: `Escribe una pregunta de entre 3 y ${LARGO_MAXIMO} caracteres.` });
  }

  const actual = asistenteActual();
  if (!actual) {
    return res.status(503).json({ error: "El asistente de IA no está activo en esta instalación." });
  }

  try {
    const resultado = await actual.responder({ pregunta, db: req.db, tenantId: req.user.tenantId });
    return res.json(resultado);
  } catch (err) {
    const respuesta = respuestaParaElError(err);
    if (!respuesta) throw err;
    return res.status(respuesta.estado).json(respuesta.cuerpo);
  }
}

module.exports = { estado, preguntar, usarClienteDePrueba };
