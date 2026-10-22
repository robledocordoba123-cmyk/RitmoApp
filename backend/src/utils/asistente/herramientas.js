// RF-23 · HU-24: herramientas del asistente de IA del administrador.
//
// Reglas de diseño (ADR-004):
// - Todas son de SOLO LECTURA: el asistente consulta, nunca crea, cambia ni
//   borra nada (OWASP LLM06, agencia excesiva).
// - La academia no la decide el modelo: cada herramienta recibe db (el cliente
//   aislado por academia de la petición) y tenantId del token (RN-04).
// - Devuelven lo mínimo necesario: nombres sí, correos, teléfonos e ids no
//   (Ley 1581, principio de necesidad).
// - Reutilizan los mismos cálculos de la pantalla de reportes (utils/reportes.js).
const prisma = require("../../config/prisma");
const reportes = require("../reportes");
const { calcularEstado } = require("../membresia");

const ZONA_HORARIA = process.env.TZ_ACADEMIAS || "America/Bogota";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA_HORARIA });
const MAX_FILAS = 40;

const rangoDeFechas = {
  type: "object",
  properties: {
    desde: { type: "string", description: "Primer día del periodo, en formato YYYY-MM-DD (hora de Colombia)." },
    hasta: { type: "string", description: "Último día del periodo (incluido), en formato YYYY-MM-DD." },
  },
  required: ["desde", "hasta"],
  additionalProperties: false,
};

const DEFINICIONES = [
  {
    name: "ocupacion_por_salon",
    description:
      "Ocupación de cada salón en un periodo: clases dictadas, cupos ofrecidos, reservas confirmadas y porcentaje de ocupación, del salón más lleno al más vacío. Úsala para preguntas sobre qué salón se usa más o menos, o qué tan llenas van las clases. No incluye clases canceladas.",
    input_schema: rangoDeFechas,
  },
  {
    name: "ingresos",
    description:
      "Pagos registrados por la academia en un periodo: total en pesos colombianos, cantidad de pagos, y el detalle por tarifa y por medio de pago (efectivo, transferencia, tarjeta, otro). Úsala para preguntas de dinero, ventas o recaudo.",
    input_schema: rangoDeFechas,
  },
  {
    name: "asistencia",
    description:
      "Asistencia de las clases del periodo que ya empezaron: resumen general, las clases con su conteo y los estudiantes ordenados de quien más falta a quien menos. El porcentaje solo cuenta la asistencia que el profesor ya registró. Úsala para preguntas sobre quién falta, quién asiste o qué clases no tienen la asistencia registrada.",
    input_schema: rangoDeFechas,
  },
  {
    name: "membresias",
    description:
      "Estado de la membresía de los estudiantes activos: AL_DIA, VENCIDA o SIN_PAGOS, con la fecha hasta la que está vigente. Con filtro POR_VENCER devuelve los que están al día pero vencen dentro de los próximos `dias` días. Úsala para preguntas sobre quién debe, quién está por vencer o quién nunca ha pagado.",
    input_schema: {
      type: "object",
      properties: {
        filtro: {
          type: "string",
          enum: ["TODAS", "AL_DIA", "VENCIDA", "SIN_PAGOS", "POR_VENCER"],
          description: "Qué estudiantes devolver.",
        },
        dias: { type: "integer", description: "Solo para POR_VENCER: cuántos días hacia adelante mirar (por ejemplo 7). En los otros filtros se ignora." },
      },
      required: ["filtro", "dias"],
      additionalProperties: false,
    },
  },
  {
    name: "clases_programadas",
    description:
      "Clases programadas (no canceladas) que empiezan en el periodo, en orden de fecha: ritmo, salón, profesor, cupo máximo y cupos disponibles. Úsala para preguntas sobre la agenda, qué clases vienen o cuáles tienen cupos libres.",
    input_schema: rangoDeFechas,
  },
].map((h) => ({ ...h, strict: true }));

// Nombres legibles para mostrarle al administrador qué consultó el asistente.
const NOMBRES = {
  ocupacion_por_salon: "Ocupación por salón",
  ingresos: "Ingresos",
  asistencia: "Asistencia",
  membresias: "Membresías",
  clases_programadas: "Clases programadas",
};

class ErrorDeHerramienta extends Error {}

function rango(entrada) {
  const r = reportes.rangoDeFechas(entrada || {});
  if (r.error) throw new ErrorDeHerramienta(r.error);
  return r;
}

const EJECUTORES = {
  async ocupacion_por_salon(entrada, { db }) {
    const salones = await reportes.ocupacionPorSalon(db, rango(entrada));
    return { periodo: entrada, salones: salones.map(({ salonId, ...s }) => s) };
  },

  async ingresos(entrada, { db }) {
    return { periodo: entrada, moneda: "COP", ...(await reportes.ingresos(db, rango(entrada))) };
  },

  async asistencia(entrada, { db }) {
    const r = await reportes.asistencia(db, rango(entrada));
    return {
      periodo: entrada,
      resumen: r.resumen,
      clases: r.porClase.slice(0, MAX_FILAS).map(({ claseId, fechaHoraInicio, ...c }) => ({ fecha: FECHA_HORA.format(fechaHoraInicio), ...c })),
      estudiantes: r.porEstudiante.slice(0, MAX_FILAS).map(({ estudianteId, ...e }) => e),
      recortado: r.porClase.length > MAX_FILAS || r.porEstudiante.length > MAX_FILAS,
    };
  },

  async membresias(entrada, { db, tenantId, ahora = new Date() }) {
    const { filtro, dias } = entrada || {};
    if (!NOMBRES_FILTRO.has(filtro)) throw new ErrorDeHerramienta("filtro no válido.");
    const [estudiantes, vigencias] = await Promise.all([
      // users no está en el cliente aislado: se filtra a mano por la academia del token.
      prisma.user.findMany({
        where: { tenantId, rol: "ESTUDIANTE", activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
      db.pago.groupBy({ by: ["estudianteId"], _max: { vigenteHasta: true } }),
    ]);
    const ultima = new Map(vigencias.map((v) => [v.estudianteId, v._max.vigenteHasta]));
    const limiteDias = Number.isInteger(dias) && dias > 0 ? Math.min(dias, 90) : 7;

    const filas = estudiantes
      .map((e) => {
        const m = calcularEstado(ultima.get(e.id) || null, ahora);
        return { nombre: e.nombre, estado: m.estado, vigenteHasta: m.vigenteHasta ? DIA.format(m.vigenteHasta) : null, diasRestantes: m.diasRestantes };
      })
      .filter((f) => {
        if (filtro === "TODAS") return true;
        if (filtro === "POR_VENCER") return f.estado === "AL_DIA" && f.diasRestantes <= limiteDias;
        return f.estado === filtro;
      });
    return { filtro, ...(filtro === "POR_VENCER" ? { dias: limiteDias } : {}), total: filas.length, estudiantes: filas.slice(0, MAX_FILAS), recortado: filas.length > MAX_FILAS };
  },

  async clases_programadas(entrada, { db }) {
    const { inicio, finExclusivo } = rango(entrada);
    const clases = await db.clase.findMany({
      where: { estado: "PROGRAMADA", fechaHoraInicio: { gte: inicio, lt: finExclusivo } },
      include: { ritmo: { select: { nombre: true } }, salon: { select: { nombre: true } }, profesor: { select: { nombre: true } } },
      orderBy: { fechaHoraInicio: "asc" },
      take: MAX_FILAS + 1,
    });
    return {
      periodo: entrada,
      clases: clases.slice(0, MAX_FILAS).map((c) => ({
        fecha: FECHA_HORA.format(c.fechaHoraInicio),
        ritmo: c.ritmo.nombre,
        salon: c.salon.nombre,
        profesor: c.profesor.nombre,
        cupoMaximo: c.cupoMaximo,
        cuposDisponibles: c.cuposDisponibles,
      })),
      recortado: clases.length > MAX_FILAS,
    };
  },
};

const NOMBRES_FILTRO = new Set(DEFINICIONES.find((h) => h.name === "membresias").input_schema.properties.filtro.enum);

// Ejecuta una herramienta pedida por el modelo. Nunca lanza: devuelve
// { contenido, esError } para mandarlo de vuelta como tool_result.
async function ejecutar(nombre, entrada, contexto) {
  const ejecutor = EJECUTORES[nombre];
  if (!ejecutor) return { contenido: `La herramienta "${nombre}" no existe.`, esError: true };
  try {
    return { contenido: JSON.stringify(await ejecutor(entrada, contexto)), esError: false };
  } catch (err) {
    if (err instanceof ErrorDeHerramienta) return { contenido: err.message, esError: true };
    console.error(JSON.stringify({ fecha: new Date().toISOString(), nivel: "error", evento: "asistente_herramienta", herramienta: nombre, error: err.message }));
    return { contenido: "No se pudo consultar esa información en este momento.", esError: true };
  }
}

module.exports = { DEFINICIONES, NOMBRES, ejecutar };
