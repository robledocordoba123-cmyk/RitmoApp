const prisma = require("../config/prisma");
const { errorEnFotoPerfil } = require("../utils/fotoPerfil");

// RF-07 · HU-07: cada usuario (de cualquier rol) ve y edita su propio perfil.
// El id sale siempre del token, nunca de la URL, así que nadie puede editar el
// perfil de otra persona por esta ruta.
const CAMPOS_PERFIL = { id: true, nombre: true, email: true, rol: true, tenantId: true, fotoPerfil: true };

async function obtener(req, res) {
  const usuario = await prisma.user.findUnique({ where: { id: req.user.id }, select: CAMPOS_PERFIL });
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });
  res.json(usuario);
}

async function actualizar(req, res) {
  const { nombre, email, fotoPerfil } = req.body;

  // HU-07-CA-03: el correo es el usuario para iniciar sesión. Cambiarlo
  // exigiría confirmar el correo nuevo, así que desde el perfil no se permite.
  if (email !== undefined) {
    return res.status(400).json({
      error: "El correo no se puede cambiar desde el perfil porque es tu usuario para iniciar sesión.",
    });
  }

  const cambios = {};
  if (nombre !== undefined) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ error: "El nombre no puede quedar vacío." });
    }
    if (nombre.trim().length > 80) {
      return res.status(400).json({ error: "El nombre puede tener máximo 80 caracteres." });
    }
    cambios.nombre = nombre.trim();
  }

  // null quita la foto; un texto tiene que ser una imagen válida (HU-07-CA-02).
  if (fotoPerfil !== undefined) {
    if (fotoPerfil !== null) {
      const error = errorEnFotoPerfil(fotoPerfil);
      if (error) return res.status(400).json({ error });
    }
    cambios.fotoPerfil = fotoPerfil;
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: "No hay cambios para guardar." });
  }

  const usuario = await prisma.user.update({ where: { id: req.user.id }, data: cambios, select: CAMPOS_PERFIL });
  res.json(usuario);
}

module.exports = { obtener, actualizar };
