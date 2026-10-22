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

async function preguntar(req, res) {
  const pregunta = typeof req.body?.pregunta === "string" ? req.body.pregunta.trim() : "";
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
    if (err instanceof ErrorDelAsistente) {
      return res.status(422).json({ error: err.message, codigo: err.codigo });
    }
    // Se registra el detalle en el servidor, pero al usuario solo se le da
    // un mensaje claro: nunca la clave, la respuesta cruda ni el error interno.
    console.error(JSON.stringify({ fecha: new Date().toISOString(), nivel: "error", evento: "asistente", tipo: err.constructor?.name, estado: err.status, error: err.message }));
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "El asistente está recibiendo muchas preguntas. Intenta en un minuto." });
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return res.status(503).json({ error: "El asistente no está bien configurado. Avísale al equipo técnico." });
    }
    if (err instanceof Anthropic.APIConnectionError || err instanceof Anthropic.APIError) {
      return res.status(503).json({ error: "El asistente no está disponible en este momento. Intenta más tarde." });
    }
    throw err;
  }
}

module.exports = { estado, preguntar, usarClienteDePrueba };
