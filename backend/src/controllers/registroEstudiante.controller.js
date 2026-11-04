// HU-22: un estudiante se registra solo con el código de invitación de su
// academia. La cuenta siempre queda con el rol ESTUDIANTE y dentro de esa
// academia (RN-04); los profesores los sigue creando el administrador (HU-17).
// Igual que en HU-06, la cuenta queda pendiente hasta que la persona abra el
// enlace que le llega al correo: así no se pueden crear cuentas con correos
// ajenos. Sin pagos registrados no puede reservar (RN-05), como cualquier
// estudiante nuevo.
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { normalizarEmail, passwordValida, LONGITUD_MINIMA_PASSWORD } = require("../utils/validaciones");
const { datosDeAutorizacion } = require("../utils/privacidad");
const { normalizarCodigo, vigente } = require("../utils/invitacion");
const { crearEnlace, enviarEnlace } = require("./confirmacion.controller");

const SALT_ROUNDS = 10;
const LONGITUD_MAXIMA_NOMBRE = 80;
// El mismo mensaje para un código inexistente, vencido o de una academia
// suspendida: no hace falta decir cuál de las tres pasó (HU-22-CA-02).
const CODIGO_INVALIDO = "El código de invitación no es válido o ya venció. Pide uno nuevo a tu academia.";

async function academiaDelCodigo(codigo) {
  const limpio = normalizarCodigo(codigo);
  if (!limpio) return null;
  const tenant = await prisma.tenant.findUnique({ where: { codigoInvitacion: limpio } });
  if (!tenant || tenant.estado !== "ACTIVA" || !vigente(tenant)) return null;
  return tenant;
}

// Para que la pantalla muestre a qué academia se va a registrar la persona
// antes de que llene el formulario.
async function consultarCodigo(req, res) {
  const tenant = await academiaDelCodigo(req.params.codigo);
  if (!tenant) return res.status(404).json({ error: CODIGO_INVALIDO });
  res.json({ academia: tenant.nombre });
}

async function registrar(req, res) {
  const { codigo, password } = req.body;
  const nombre = typeof req.body.nombre === "string" ? req.body.nombre.trim() : "";
  const email = normalizarEmail(req.body.email);

  if (!codigo || !nombre || !email || !password) {
    return res.status(400).json({ error: "El código, tu nombre, tu correo y una contraseña son obligatorios." });
  }
  if (nombre.length > LONGITUD_MAXIMA_NOMBRE) {
    return res.status(400).json({ error: `El nombre puede tener máximo ${LONGITUD_MAXIMA_NOMBRE} caracteres.` });
  }
  if (!passwordValida(password)) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.` });
  }
  // Ley 1581: debe ser true explícito. Si es menor de edad, la autorización
  // la da su representante legal (HU-22-CA-03).
  if (req.body.aceptaPoliticaDatos !== true) {
    return res.status(400).json({ error: "Debes aceptar la política de tratamiento de datos para registrarte." });
  }
  if (req.body.menorDeEdad === true && req.body.autorizaRepresentante !== true) {
    return res.status(400).json({
      error: "Si eres menor de edad, tu madre, padre o representante legal debe autorizar el tratamiento de tus datos.",
    });
  }

  const tenant = await academiaDelCodigo(codigo);
  if (!tenant) return res.status(400).json({ error: CODIGO_INVALIDO });

  const yaExiste = await prisma.user.findUnique({ where: { email } });
  if (yaExiste) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña." });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { estudiante, enlace } = await prisma.$transaction(async (tx) => {
    const estudiante = await tx.user.create({
      data: {
        tenantId: tenant.id,
        nombre,
        email,
        passwordHash,
        rol: "ESTUDIANTE",
        confirmacionPendiente: true,
        ...datosDeAutorizacion(),
      },
    });
    const enlace = await crearEnlace(estudiante, tx);
    return { estudiante, enlace };
  });

  enviarEnlace(estudiante, enlace);

  return res.status(201).json({
    mensaje: "Cuenta creada. Te enviamos un correo para confirmarla.",
    academia: tenant.nombre,
    confirmacionPendiente: true,
    email: estudiante.email,
  });
}

module.exports = { consultarCodigo, registrar, CODIGO_INVALIDO };
