// RF-18: el administrador de academia crea y edita salones de su propia
// academia. req.db ya viene aislado por tenant (middleware requireTenant).

// Devuelve el nombre limpio, o null si no es un texto con contenido.
function nombreValido(nombre) {
  return typeof nombre === "string" && nombre.trim() ? nombre.trim() : null;
}

function capacidadValida(capacidad) {
  return Number.isInteger(capacidad) && capacidad > 0;
}

async function listar(req, res) {
  const salones = await req.db.salon.findMany({ orderBy: { nombre: "asc" } });
  res.json(salones);
}

async function crear(req, res) {
  const nombre = nombreValido(req.body.nombre);
  const { capacidad } = req.body;

  if (!nombre || !capacidadValida(capacidad)) {
    return res.status(400).json({ error: "nombre y capacidad (entero positivo) son obligatorios." });
  }

  const salon = await req.db.salon.create({ data: { nombre, capacidad } });
  res.status(201).json(salon);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { nombre, capacidad, activo } = req.body;

  // Los tres campos son opcionales en la edición, pero el que venga debe ser válido.
  if (
    (nombre !== undefined && !nombreValido(nombre)) ||
    (capacidad !== undefined && !capacidadValida(capacidad)) ||
    (activo !== undefined && typeof activo !== "boolean")
  ) {
    return res.status(400).json({ error: "nombre no puede ir vacío, capacidad debe ser un entero positivo y activo, true o false." });
  }

  try {
    const salon = await req.db.salon.update({
      where: { id },
      data: { nombre: nombre?.trim(), capacidad, activo },
    });
    res.json(salon);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Salón no encontrado en esta academia." });
    }
    throw err;
  }
}

async function eliminar(req, res) {
  const { id } = req.params;

  try {
    await req.db.salon.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Salón no encontrado en esta academia." });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "No se puede eliminar: el salón tiene clases asociadas." });
    }
    throw err;
  }
}

module.exports = { listar, crear, actualizar, eliminar };
