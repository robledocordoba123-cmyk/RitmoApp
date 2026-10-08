// RF-09 · HU-09: reservar un cupo. El punto crítico es RN-01 (no exceder el
// cupo) bajo concurrencia real (dos estudiantes pidiendo el último cupo a la
// vez). Se resuelve con un UPDATE condicional atómico: la fila solo se
// decrementa si en ESE momento todavía queda cupo, y Postgres serializa esa
// operación a nivel de fila sin que tengamos que hacer locking manual.
async function reservar(req, res) {
  const { claseId } = req.body;
  const estudianteId = req.user.id;

  if (!claseId) {
    return res.status(400).json({ error: "claseId es obligatorio." });
  }

  let resultado;
  try {
    resultado = await req.db.$transaction(async (tx) => {
      const clase = await tx.clase.findUnique({ where: { id: claseId } });

      if (!clase) return { tipo: "no_encontrada" };
      if (clase.estado !== "PROGRAMADA" || clase.fechaHoraInicio <= new Date()) {
        return { tipo: "no_disponible" };
      }

      // Se valida ANTES de tocar el cupo: si ya existe reserva, no debe
      // decrementarse nada (evita perder un cupo por un intento duplicado).
      const yaReservada = await tx.reserva.findUnique({
        where: { claseId_estudianteId: { claseId, estudianteId } },
      });
      if (yaReservada && yaReservada.estado === "CONFIRMADA") {
        return { tipo: "ya_reservada" };
      }

      const decremento = await tx.clase.updateMany({
        where: { id: claseId, cuposDisponibles: { gt: 0 } },
        data: { cuposDisponibles: { decrement: 1 } },
      });
      if (decremento.count === 0) {
        return { tipo: "sin_cupo" };
      }

      // Si dos solicitudes del mismo estudiante llegan casi a la vez, ambas
      // pueden pasar el chequeo de "yaReservada" antes de que cualquiera cree
      // la fila. La restricción única del modelo detiene a la segunda; que
      // ese error se propague hace rollback de TODA la transacción, incluido
      // el decremento de cupo que esa segunda solicitud hizo de más.
      // Si el estudiante había cancelado antes, se reactiva esa misma fila:
      // la restricción única (claseId, estudianteId) no permite crear otra.
      const reserva = yaReservada
        ? await tx.reserva.update({
            where: { id: yaReservada.id },
            data: { estado: "CONFIRMADA" },
          })
        : await tx.reserva.create({
            data: { claseId, estudianteId, estado: "CONFIRMADA" },
          });
      return { tipo: "ok", reserva };
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ya tienes una reserva para esta clase." });
    }
    throw err;
  }

  switch (resultado.tipo) {
    case "no_encontrada":
      return res.status(404).json({ error: "La clase no existe en esta academia." });
    case "no_disponible":
      return res.status(400).json({ error: "La clase ya no está disponible (cancelada o ya pasó)." });
    case "sin_cupo":
      return res.status(400).json({ error: "No quedan cupos disponibles para esta clase." });
    case "ya_reservada":
      return res.status(409).json({ error: "Ya tienes una reserva para esta clase." });
    default:
      return res.status(201).json(resultado.reserva);
  }
}

async function misReservas(req, res) {
  const reservas = await req.db.reserva.findMany({
    where: { estudianteId: req.user.id },
    include: { clase: { include: { ritmo: true, salon: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reservas);
}

// El estudiante cancela su propia reserva y el cupo vuelve a quedar libre
// para otro. Solo se permite antes de que empiece la clase. El cambio de
// estado es condicional (solo si sigue CONFIRMADA), así que dos
// cancelaciones simultáneas no pueden devolver el cupo dos veces.
async function cancelar(req, res) {
  const { id } = req.params;
  const estudianteId = req.user.id;

  const resultado = await req.db.$transaction(async (tx) => {
    const reserva = await tx.reserva.findFirst({
      where: { id, estudianteId },
      include: { clase: true },
    });

    if (!reserva) return { tipo: "no_encontrada" };
    if (reserva.estado !== "CONFIRMADA") return { tipo: "ya_cancelada" };
    if (reserva.clase.fechaHoraInicio <= new Date()) return { tipo: "clase_iniciada" };

    const cambio = await tx.reserva.updateMany({
      where: { id, estado: "CONFIRMADA" },
      data: { estado: "CANCELADA" },
    });
    if (cambio.count === 0) return { tipo: "ya_cancelada" };

    // Si la clase fue cancelada por la academia, no hay cupo que devolver.
    if (reserva.clase.estado === "PROGRAMADA") {
      await tx.clase.update({
        where: { id: reserva.claseId },
        data: { cuposDisponibles: { increment: 1 } },
      });
    }
    return { tipo: "ok" };
  });

  switch (resultado.tipo) {
    case "no_encontrada":
      return res.status(404).json({ error: "Reserva no encontrada." });
    case "ya_cancelada":
      return res.status(409).json({ error: "Esta reserva ya estaba cancelada." });
    case "clase_iniciada":
      return res.status(400).json({ error: "No se puede cancelar: la clase ya empezó o ya pasó." });
    default:
      return res.json({ mensaje: "Reserva cancelada. El cupo quedó libre." });
  }
}

module.exports = { reservar, misReservas, cancelar };
