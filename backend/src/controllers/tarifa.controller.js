// RF-18 · HU-18: tarifas (planes) que vende la academia. Editar una tarifa no
// cambia los pagos ya registrados, porque cada pago guarda su propia copia de
// nombre, valor y duración (HU-18-CA-03).

// Una regla por campo: cada una devuelve el mensaje de error o null.
const REGLAS = {
  nombre: (v) => (typeof v !== "string" || !v.trim() ? "nombre es obligatorio." : null),
  valor: (v) => (!Number.isInteger(v) || v <= 0 ? "valor debe ser un entero positivo (pesos)." : null),
  duracionDias: (v) => (!Number.isInteger(v) || v <= 0 || v > 366 ? "duracionDias debe ser un entero entre 1 y 366." : null),
};

// En una edición (parcial) solo se revisan los campos que llegan.
function validar(datos, parcial = false) {
  for (const [campo, regla] of Object.entries(REGLAS)) {
    if (parcial && datos[campo] === undefined) continue;
    const error = regla(datos[campo]);
    if (error) return error;
  }
  return null;
}

async function listar(req, res) {
  const tarifas = await req.db.tarifa.findMany({ orderBy: [{ activa: "desc" }, { nombre: "asc" }] });
  res.json(tarifas);
}

async function crear(req, res) {
  const error = validar(req.body);
  if (error) return res.status(400).json({ error });

  const { nombre, valor, duracionDias } = req.body;
  const tarifa = await req.db.tarifa.create({ data: { nombre: nombre.trim(), valor, duracionDias } });
  res.status(201).json(tarifa);
}

async function actualizar(req, res) {
  const error = validar(req.body, true);
  if (error) return res.status(400).json({ error });
  if (req.body.activa !== undefined && typeof req.body.activa !== "boolean") {
    return res.status(400).json({ error: "activa debe ser verdadero o falso." });
  }

  const { nombre, valor, duracionDias, activa } = req.body;
  try {
    const tarifa = await req.db.tarifa.update({
      where: { id: req.params.id },
      data: { nombre: nombre?.trim(), valor, duracionDias, activa },
    });
    res.json(tarifa);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Tarifa no encontrada en esta academia." });
    }
    throw err;
  }
}

// RN-13: una tarifa con pagos no se borra (se perdería el historial); se
// desactiva para que no se pueda usar en pagos nuevos.
async function eliminar(req, res) {
  try {
    await req.db.tarifa.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Tarifa no encontrada en esta academia." });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "No se puede eliminar: la tarifa tiene pagos registrados. Desactívala en su lugar." });
    }
    throw err;
  }
}

module.exports = { listar, crear, actualizar, eliminar };
