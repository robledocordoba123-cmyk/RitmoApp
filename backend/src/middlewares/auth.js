const jwt = require("jsonwebtoken");

// Verifica el JWT y adjunta { id, rol, tenantId } en req.user (RF-02).
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, rol: payload.rol, tenantId: payload.tenantId };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

// Exige que req.user tenga uno de los roles permitidos.
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
