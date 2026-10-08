// RF-19 · HU-19: el administrador registra los pagos que la academia recibe
// por sus medios habituales (no hay pasarela en línea, ver DOC-03). Cada pago
// extiende la membresía del estudiante (RN-05) y debe ser válido (RN-14).
// RF-12 · HU-12: el estudiante consulta sus pagos y el estado de su membresía.
const prisma = require("../config/prisma");
const { estadoMembresia, calcularEstado, calcularVigencia } = require("../utils/membresia");

const MEDIOS = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"];

const DATOS_DEL_PAGO = {
  id: true,
  nombreTarifa: true,
  monto: true,
  duracionDias: true,
  medio: true,
  referencia: true,
  vigenteDesde: true,
  vigenteHasta: true,
  registradoEn: true,
};

async function registrar(req, res) {
  const { estudianteId, tarifaId, medio } = req.body;
  const referencia = typeof req.body.referencia === "string" ? req.body.referencia.trim() || null : null;

  if (!estudianteId || !tarifaId || !MEDIOS.includes(medio)) {
    return res.status(400).json({ error: `estudianteId, tarifaId y medio (${MEDIOS.join(", ")}) son obligatorios.` });
  }

  // users no está en el cliente aislado por tenant: se filtra a mano para
  // que un admin no pueda registrar pagos a estudiantes de otra academia.
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, tenantId: req.user.tenantId, rol: "ESTUDIANTE", activo: true },
    select: { id: true },
  });
  if (!estudiante) {
    return res.status(404).json({ error: "El estudiante no existe en esta academia." });
  }

  // RN-14: la tarifa debe existir, ser de esta academia y estar activa.
  const tarifa = await req.db.tarifa.findUnique({ where: { id: tarifaId } });
  if (!tarifa || !tarifa.activa) {
    return res.status(400).json({ error: "La tarifa no existe en esta academia o está desactivada." });
  }

  // Por defecto se cobra el valor de la tarifa; el admin puede indicar otro
  // (por ejemplo un descuento), pero nunca cero ni negativo (RN-14).
  const monto = req.body.monto === undefined ? tarifa.valor : req.body.monto;
  if (!Number.isInteger(monto) || monto <= 0) {
    return res.status(400).json({ error: "El monto debe ser un número entero mayor que cero." });
  }

  const pago = await req.db.$transaction(async (tx) => {
    // Bloquea la fila del estudiante hasta que termine la transacción: si se
    // registran dos pagos suyos a la vez, el segundo espera y extiende desde
    // donde terminó el primero, en lugar de que ambos cuenten desde la misma
    // fecha y se pierdan días.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${estudianteId} FOR UPDATE`;

    const actual = await estadoMembresia(tx, estudianteId);
    const vigencia = calcularVigencia(actual.vigenteHasta, tarifa.duracionDias);

    return tx.pago.create({
      data: {
        estudianteId,
        tarifaId: tarifa.id,
        nombreTarifa: tarifa.nombre,
        monto,
        duracionDias: tarifa.duracionDias,
        medio,
        referencia,
        ...vigencia,
        registradoPorId: req.user.id,
      },
      select: { ...DATOS_DEL_PAGO, estudianteId: true, registradoPorId: true },
    });
  });

  res.status(201).json({ pago, membresia: calcularEstado(pago.vigenteHasta) });
}

async function listar(req, res) {
  const { estudianteId } = req.query;
  const pagos = await req.db.pago.findMany({
    where: estudianteId ? { estudianteId } : {},
    select: {
      ...DATOS_DEL_PAGO,
      estudiante: { select: { id: true, nombre: true } },
      registradoPor: { select: { nombre: true } },
    },
    orderBy: { registradoEn: "desc" },
    take: 200,
  });
  res.json(pagos);
}

// Estado de membresía de cada estudiante activo, para que el admin vea de un
// vistazo quién está al día y quién no.
async function membresias(req, res) {
  const [estudiantes, vigencias] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: req.user.tenantId, rol: "ESTUDIANTE", activo: true },
      select: { id: true, nombre: true, email: true },
      orderBy: { nombre: "asc" },
    }),
    req.db.pago.groupBy({ by: ["estudianteId"], _max: { vigenteHasta: true } }),
  ]);

  const ultimaVigencia = new Map(vigencias.map((v) => [v.estudianteId, v._max.vigenteHasta]));
  const ahora = new Date();
  res.json(
    estudiantes.map((e) => ({ ...e, membresia: calcularEstado(ultimaVigencia.get(e.id) || null, ahora) }))
  );
}

async function misPagos(req, res) {
  const [membresia, pagos] = await Promise.all([
    estadoMembresia(req.db, req.user.id),
    req.db.pago.findMany({
      where: { estudianteId: req.user.id },
      select: DATOS_DEL_PAGO,
      orderBy: { registradoEn: "desc" },
    }),
  ]);
  res.json({ membresia, pagos });
}

module.exports = { registrar, listar, membresias, misPagos };
