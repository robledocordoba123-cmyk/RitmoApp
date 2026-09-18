// RF-04: catálogo de estilos de baile que ofrece cada academia.

async function listar(req, res) {
  const ritmos = await req.db.ritmo.findMany({ orderBy: { nombre: "asc" } });
  res.json(ritmos);
}

async function crear(req, res) {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "nombre es obligatorio." });
  }

  const ritmo = await req.db.ritmo.create({ data: { nombre } });
  res.status(201).json(ritmo);
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { nombre } = req.body;

  try {
    const ritmo = await req.db.ritmo.update({ where: { id }, data: { nombre } });
    res.json(ritmo);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Ritmo no encontrado en esta academia." });
    }
    throw err;
  }
}

async function eliminar(req, res) {
  const { id } = req.params;

  try {
    await req.db.ritmo.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Ritmo no encontrado en esta academia." });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ error: "No se puede eliminar: el ritmo tiene clases asociadas." });
    }
    throw err;
  }
}

module.exports = { listar, crear, actualizar, eliminar };
