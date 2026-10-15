const path = require("path");
const { spawnSync } = require("child_process");
const bcrypt = require("bcryptjs");
const { limpiarBD, prisma } = require("./helpers/db");
const { crearAcademia, crearUsuario } = require("./helpers/fixtures");
const { crearSuperAdmin } = require("../scripts/crear-superadmin");

// SEG-07, condición 3: una academia real arranca sin datos de demostración y
// con un SuperAdmin cuya contraseña no es la de prueba.

beforeEach(async () => {
  await limpiarBD();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function correrSeed(script, args = []) {
  return spawnSync(process.execPath, [path.join(__dirname, "..", "prisma", script), ...args], {
    env: { ...process.env, NODE_ENV: "production" },
    encoding: "utf8",
  });
}

describe("Instalación para una academia real (SEG-07)", () => {
  test("CP-133 · en producción los seeds de demo se niegan a correr sin --permitir-demo", async () => {
    for (const script of ["seed.js", "seed-demo.js"]) {
      const resultado = correrSeed(script);
      expect(resultado.status).toBe(1);
      expect(resultado.stderr).toMatch(/no se cargan datos de demostración en producción/);
    }
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.tenant.count()).toBe(0);
  });

  test("CP-134 · crea el SuperAdmin con el correo normalizado y la contraseña cifrada", async () => {
    const r = await crearSuperAdmin(prisma, { email: "  Dueña@RitmoApp.co ", password: "Una-Clave-Larga-2027" });

    const usuario = await prisma.user.findUnique({ where: { id: r.id } });
    expect(r.creado).toBe(true);
    expect(usuario).toMatchObject({ email: "dueña@ritmoapp.co", rol: "SUPERADMIN", tenantId: null });
    expect(usuario.passwordHash).not.toContain("Una-Clave");
    expect(await bcrypt.compare("Una-Clave-Larga-2027", usuario.passwordHash)).toBe(true);
  });

  test("CP-135 · rechaza una contraseña corta o la contraseña de prueba de la demo", async () => {
    await expect(crearSuperAdmin(prisma, { email: "a@ritmoapp.co", password: "corta" })).rejects.toThrow(/al menos 8/);
    await expect(crearSuperAdmin(prisma, { email: "a@ritmoapp.co", password: "Prueba123!" })).rejects.toThrow(/contraseña de prueba/);
    expect(await prisma.user.count()).toBe(0);
  });

  test("CP-136 · si el SuperAdmin ya existe no cambia su contraseña, y no convierte a otra cuenta en SuperAdmin", async () => {
    const primera = await crearSuperAdmin(prisma, { email: "dueña@ritmoapp.co", password: "Una-Clave-Larga-2027" });
    const segunda = await crearSuperAdmin(prisma, { email: "dueña@ritmoapp.co", password: "Otra-Clave-Distinta-1" });
    const guardado = await prisma.user.findUnique({ where: { id: primera.id } });
    expect(segunda).toEqual({ creado: false, id: primera.id });
    expect(await bcrypt.compare("Una-Clave-Larga-2027", guardado.passwordHash)).toBe(true);

    const academia = await crearAcademia();
    await crearUsuario(academia.id, "ADMIN_ACADEMIA", { email: "admin@academia.co" });
    await expect(crearSuperAdmin(prisma, { email: "admin@academia.co", password: "Una-Clave-Larga-2027" })).rejects.toThrow(/no es SuperAdmin/);
  });
});
