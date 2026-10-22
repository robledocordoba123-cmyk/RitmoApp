// RF-21 · HU-21: bitácora de auditoría. En vez de repetir el registro en cada
// controlador, este middleware mira cada petición que cambia datos y, si
// terminó bien (2xx), anota quién la hizo, qué hizo y cuándo. Así ninguna
// acción nueva queda por fuera por olvido: basta con agregarla a ACCIONES.
// Si escribir en la bitácora falla, solo se registra el error: la acción del
// usuario ya quedó hecha y no se revierte por eso.
const prisma = require("../config/prisma");

const PESOS = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: process.env.TZ_ACADEMIAS || "America/Bogota",
});
const ROLES = { ADMIN_ACADEMIA: "administrador", PROFESOR: "profesor", ESTUDIANTE: "estudiante" };

const fecha = (valor) => (valor ? FECHA_HORA.format(new Date(valor)) : null);
const nombre = (cuerpo) => cuerpo?.nombre ?? null;

// [método, ruta, acción, detalle, entidad]. El detalle sale de la respuesta y
// nunca incluye contraseñas ni correos: solo lo necesario para saber qué
// cambió. "entidad" es opcional: dice de qué parte de la ruta sale el id
// cuando no es el segundo tramo (por ejemplo /qr/clases/:id/asistencia).
const ACCIONES = [
  ["POST", /^\/clases$/, "Programó una clase", (c) => (c?.fechaHoraInicio ? `Clase del ${fecha(c.fechaHoraInicio)}` : null)],
  ["PATCH", /^\/clases\/[^/]+\/cancelar$/, "Canceló una clase", (c) => (c?.fechaHoraInicio ? `Clase del ${fecha(c.fechaHoraInicio)}` : null)],
  ["POST", /^\/clases\/[^/]+\/asistencia$/, "Registró la asistencia de una clase", (c) => (Array.isArray(c) ? `${c.length} estudiante(s)` : null)],
  [
    "POST",
    /^\/qr\/clases\/[^/]+\/asistencia$/,
    "Registró asistencia con código QR",
    (c) => (c?.estudiante ? `${c.estudiante.nombre}${c.yaEstabaRegistrado ? " · ya estaba registrado" : ""}` : null),
    (ruta) => ruta.split("/")[3],
  ],
  ["POST", /^\/reservas$/, "Reservó una clase", () => null],
  ["PATCH", /^\/reservas\/[^/]+\/cancelar$/, "Canceló una reserva", () => null],
  ["POST", /^\/pagos$/, "Registró un pago", (c) => (c?.pago ? `${c.pago.nombreTarifa} · ${PESOS.format(c.pago.monto)}` : null)],
  ["POST", /^\/salones$/, "Creó un salón", nombre],
  ["PUT", /^\/salones\/[^/]+$/, "Editó un salón", nombre],
  ["DELETE", /^\/salones\/[^/]+$/, "Eliminó un salón", () => null],
  ["POST", /^\/ritmos$/, "Creó un ritmo", nombre],
  ["PUT", /^\/ritmos\/[^/]+$/, "Editó un ritmo", nombre],
  ["DELETE", /^\/ritmos\/[^/]+$/, "Eliminó un ritmo", () => null],
  ["POST", /^\/tarifas$/, "Creó una tarifa", nombre],
  ["PUT", /^\/tarifas\/[^/]+$/, "Editó una tarifa", nombre],
  ["DELETE", /^\/tarifas\/[^/]+$/, "Desactivó una tarifa", () => null],
  ["POST", /^\/usuarios$/, "Creó un usuario", (c) => (c ? `${c.nombre} (${ROLES[c.rol] || c.rol})` : null)],
  // La pregunta no se guarda: puede traer datos personales y no hace falta para auditar.
  ["POST", /^\/asistente$/, "Consultó al asistente de IA", () => null],
  ["PATCH", /^\/usuarios\/[^/]+$/, "Editó un usuario", (c) => (c ? `${c.nombre}${c.activo === false ? " · desactivado" : ""}` : null)],
];

function buscarAccion(metodo, ruta) {
  return ACCIONES.find(([m, patron]) => m === metodo && patron.test(ruta));
}

function registrarEnBitacora(req, res, next) {
  const ruta = req.path;
  const accion = buscarAccion(req.method, ruta);
  if (!accion) return next();

  // Se intercepta la respuesta: si la acción salió bien, primero se anota en la
  // bitácora y después se envía. Así el movimiento queda guardado antes de que
  // el usuario vea el resultado. json llama internamente a send; la marca
  // "anotado" evita escribir dos veces.
  let anotado = false;
  const enviarOriginal = { json: res.json.bind(res), send: res.send.bind(res) };

  const interceptar = (tipo) => (datos) => {
    // El SuperAdmin no pertenece a una academia: sus acciones no van aquí.
    if (anotado || res.statusCode >= 300 || !req.user?.tenantId) {
      return enviarOriginal[tipo](datos);
    }
    anotado = true;
    const cuerpo = tipo === "json" ? datos : undefined;
    const [, , texto, detallar, entidadDeRuta] = accion;
    prisma.bitacora
      .create({
        data: {
          tenantId: req.user.tenantId,
          usuarioId: req.user.id,
          accion: texto,
          detalle: detallar(cuerpo),
          entidadId: entidadDeRuta ? entidadDeRuta(ruta) : (cuerpo?.id ?? cuerpo?.pago?.id ?? ruta.split("/")[2] ?? null),
        },
      })
      .catch((err) => {
        console.error(JSON.stringify({ fecha: new Date().toISOString(), nivel: "error", evento: "bitacora", accion: texto, error: err.message }));
      })
      .finally(() => enviarOriginal[tipo](datos));
    return res;
  };

  res.json = interceptar("json");
  res.send = interceptar("send");
  next();
}

module.exports = { registrarEnBitacora, buscarAccion };
