// Datos de demostración para la demo pública y las capturas del README.
// Se corre DESPUÉS de seed.js (npm run prisma:seed && npm run prisma:seed:demo).
//
// Arma una semana "viva" en Academia Ritmo Central: salones, ritmos,
// profesores, estudiantes, clases desde hace 7 días hasta dentro de 14, con
// reservas y asistencia. Las fechas son relativas a hoy, así que se puede
// volver a correr en cualquier momento y la agenda queda al día: borra la
// agenda anterior de esa academia y la genera de nuevo.
//
// Respeta las mismas reglas que la API: cupo <= capacidad del salón (RF-05),
// sin cruces de salón ni de profesor (RN-02, RN-03) y cuposDisponibles =
// cupoMaximo - reservas confirmadas (RN-01). Los pagos siguen RN-05: cada
// pago extiende la membresía desde donde terminaba el anterior.
require("dotenv/config");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD_DEMO = "Prueba123!";

// Generador pseudoaleatorio con semilla fija: la demo sale igual cada vez.
function crearAleatorio(semilla) {
  let estado = semilla;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}
const aleatorio = crearAleatorio(2026);

// Día de calendario en Colombia (UTC-5, sin horario de verano).
function fechaColombia(desplazamientoDias, hora, minutos = 0) {
  const ahoraEnColombia = new Date(Date.now() - 5 * 60 * 60 * 1000);
  ahoraEnColombia.setUTCDate(ahoraEnColombia.getUTCDate() + desplazamientoDias);
  const dia = ahoraEnColombia.toISOString().slice(0, 10);
  const hh = String(hora).padStart(2, "0");
  const mm = String(minutos).padStart(2, "0");
  return new Date(`${dia}T${hh}:${mm}:00-05:00`);
}

async function upsertUsuario(tenantId, nombre, email, rol, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: { nombre },
    create: { tenantId, nombre, email, rol, passwordHash },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);

  const academia = await prisma.tenant.findUnique({ where: { nit: "900123456-1" } });
  if (!academia) {
    throw new Error("Primero corre el seed base: npm run prisma:seed");
  }

  // --- Catálogo base ---------------------------------------------------------
  const datosSalones = [
    { id: "00000000-0000-0000-0000-000000000001", nombre: "Salón 1", capacidad: 20 },
    { id: "00000000-0000-0000-0000-000000000011", nombre: "Salón Espejos", capacidad: 14 },
    { id: "00000000-0000-0000-0000-000000000012", nombre: "Estudio Urbano", capacidad: 24 },
  ];
  const salones = [];
  for (const s of datosSalones) {
    salones.push(
      await prisma.salon.upsert({
        where: { id: s.id },
        update: { nombre: s.nombre, capacidad: s.capacidad },
        create: { ...s, tenantId: academia.id },
      })
    );
  }

  const datosRitmos = [
    { id: "00000000-0000-0000-0000-000000000002", nombre: "Salsa" },
    { id: "00000000-0000-0000-0000-000000000021", nombre: "Bachata" },
    { id: "00000000-0000-0000-0000-000000000022", nombre: "Urbano" },
    { id: "00000000-0000-0000-0000-000000000023", nombre: "Ballet" },
    { id: "00000000-0000-0000-0000-000000000024", nombre: "Tango" },
  ];
  const ritmos = {};
  for (const r of datosRitmos) {
    ritmos[r.nombre] = await prisma.ritmo.upsert({
      where: { id: r.id },
      update: { nombre: r.nombre },
      create: { ...r, tenantId: academia.id },
    });
  }

  // --- Equipo ----------------------------------------------------------------
  const profesores = {
    salsa: await upsertUsuario(academia.id, "Profe Salsa", "profesor@ritmocentral.test", "PROFESOR", passwordHash),
    bachata: await upsertUsuario(academia.id, "Laura Gómez", "laura@ritmocentral.test", "PROFESOR", passwordHash),
    urbano: await upsertUsuario(academia.id, "Andrés Mena", "andres@ritmocentral.test", "PROFESOR", passwordHash),
  };

  const nombresEstudiantes = [
    ["Estudiante Demo", "estudiante@ritmocentral.test"],
    ["Valentina Ríos", "valentina@ritmocentral.test"],
    ["Santiago Pérez", "santiago@ritmocentral.test"],
    ["Mariana López", "mariana@ritmocentral.test"],
    ["Juan José Arango", "juanjose@ritmocentral.test"],
    ["Isabella Moreno", "isabella@ritmocentral.test"],
    ["Samuel Restrepo", "samuel@ritmocentral.test"],
    ["Sara Cardona", "sara@ritmocentral.test"],
    ["Mateo Giraldo", "mateo@ritmocentral.test"],
    ["Luciana Torres", "luciana@ritmocentral.test"],
    ["Tomás Ospina", "tomas@ritmocentral.test"],
    ["Antonella Vélez", "antonella@ritmocentral.test"],
    ["Emilio Castaño", "emilio@ritmocentral.test"],
    ["Gabriela Muñoz", "gabriela@ritmocentral.test"],
  ];
  const estudiantes = [];
  for (const [nombre, email] of nombresEstudiantes) {
    estudiantes.push(await upsertUsuario(academia.id, nombre, email, "ESTUDIANTE", passwordHash));
  }
  const estudianteDemo = estudiantes[0];

  // --- Agenda y pagos: se regeneran completos --------------------------------
  // Los pagos van primero: apuntan a usuarios y tarifas que se limpian abajo.
  await prisma.pago.deleteMany({ where: { tenantId: academia.id } });
  await prisma.asistencia.deleteMany({ where: { tenantId: academia.id } });
  await prisma.reserva.deleteMany({ where: { tenantId: academia.id } });
  await prisma.clase.deleteMany({ where: { tenantId: academia.id } });

  // En la demo pública cualquiera puede entrar como admin o superadmin: se
  // deshace lo que hayan cambiado los visitantes para que la siguiente persona
  // encuentre la academia igual (activa y sin salones, ritmos o usuarios de más).
  await prisma.tenant.update({ where: { id: academia.id }, data: { estado: "ACTIVA" } });
  await prisma.salon.deleteMany({
    where: { tenantId: academia.id, id: { notIn: salones.map((s) => s.id) } },
  });
  await prisma.ritmo.deleteMany({
    where: { tenantId: academia.id, id: { notIn: Object.values(ritmos).map((r) => r.id) } },
  });
  const correosDemo = [
    "admin@ritmocentral.test",
    ...Object.values(profesores).map((p) => p.email),
    ...estudiantes.map((e) => e.email),
  ];
  await prisma.user.deleteMany({
    where: { tenantId: academia.id, email: { notIn: correosDemo } },
  });

  // Cada franja usa salones y profesores distintos entre sí, así que no hay
  // cruces. De lunes a sábado; el domingo la academia descansa.
  const franjas = [
    { hora: 17, ritmo: "Ballet", salon: 1, profesor: "bachata", cupo: 10 },
    { hora: 18, ritmo: "Salsa", salon: 0, profesor: "salsa", cupo: 16 },
    { hora: 18, ritmo: "Urbano", salon: 2, profesor: "urbano", cupo: 20 },
    { hora: 19, ritmo: "Bachata", salon: 1, profesor: "bachata", cupo: 12 },
    { hora: 20, ritmo: "Salsa", salon: 0, profesor: "salsa", cupo: 16 },
    { hora: 20, ritmo: "Tango", salon: 2, profesor: "urbano", cupo: 12 },
  ];

  const ahora = new Date();
  let totalClases = 0;
  let totalReservas = 0;

  for (let dia = -7; dia <= 14; dia++) {
    const diaSemana = fechaColombia(dia, 12).getUTCDay(); // 0 = domingo
    if (diaSemana === 0) continue;

    for (const franja of franjas) {
      // No todas las franjas se dictan todos los días: la agenda se ve real.
      if (aleatorio() < 0.25) continue;

      const inicio = fechaColombia(dia, franja.hora);
      const fin = fechaColombia(dia, franja.hora + 1);
      const yaPaso = inicio <= ahora;
      const cancelada = !yaPaso && aleatorio() < 0.05;

      // Las clases pasadas y cercanas están más llenas que las lejanas.
      const ocupacionBase = dia <= 2 ? 0.55 : 0.25;
      const cantidadReservas = Math.min(
        franja.cupo,
        estudiantes.length,
        Math.round(franja.cupo * (ocupacionBase + aleatorio() * 0.45))
      );

      // La cuenta demo se maneja aparte para que tenga una cantidad creíble de
      // reservas: unas pocas en los próximos días y algo de historial.
      const otrosEstudiantes = estudiantes.filter((e) => e !== estudianteDemo);
      const inscritos = otrosEstudiantes.sort(() => aleatorio() - 0.5).slice(0, cantidadReservas);
      const probabilidadDemo = yaPaso ? 0.12 : dia <= 5 ? 0.18 : 0;
      if (aleatorio() < probabilidadDemo && inscritos.length < franja.cupo) inscritos.push(estudianteDemo);

      const clase = await prisma.clase.create({
        data: {
          tenantId: academia.id,
          ritmoId: ritmos[franja.ritmo].id,
          salonId: salones[franja.salon].id,
          profesorId: profesores[franja.profesor].id,
          cupoMaximo: franja.cupo,
          cuposDisponibles: cancelada ? franja.cupo : franja.cupo - inscritos.length,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          estado: cancelada ? "CANCELADA" : "PROGRAMADA",
        },
      });
      totalClases++;

      if (cancelada) continue;

      await prisma.reserva.createMany({
        data: inscritos.map((e) => ({
          tenantId: academia.id,
          claseId: clase.id,
          estudianteId: e.id,
          estado: "CONFIRMADA",
        })),
      });
      totalReservas += inscritos.length;

      if (yaPaso) {
        await prisma.asistencia.createMany({
          data: inscritos.map((e) => {
            const r = aleatorio();
            return {
              tenantId: academia.id,
              claseId: clase.id,
              estudianteId: e.id,
              estado: r < 0.82 ? "ASISTIO" : r < 0.93 ? "INASISTENCIA" : "EXCUSA",
              registradoPorId: profesores[franja.profesor].id,
            };
          }),
        });
      }
    }
  }

  // --- Tarifas y pagos (RF-18, RF-19, RN-05) ----------------------------------
  const datosTarifas = [
    { id: "00000000-0000-0000-0000-000000000031", nombre: "Mensualidad", valor: 150000, duracionDias: 30 },
    { id: "00000000-0000-0000-0000-000000000032", nombre: "Tiquetera 8 clases", valor: 110000, duracionDias: 30 },
    { id: "00000000-0000-0000-0000-000000000033", nombre: "Plan trimestral", valor: 400000, duracionDias: 90 },
  ];
  const tarifas = [];
  for (const t of datosTarifas) {
    tarifas.push(
      await prisma.tarifa.upsert({
        where: { id: t.id },
        update: { nombre: t.nombre, valor: t.valor, duracionDias: t.duracionDias, activa: true },
        create: { ...t, tenantId: academia.id },
      })
    );
  }
  await prisma.tarifa.deleteMany({
    where: { tenantId: academia.id, id: { notIn: tarifas.map((t) => t.id) } },
  });

  const admin = await prisma.user.findUnique({ where: { email: "admin@ritmocentral.test" } });
  const UN_DIA = 24 * 60 * 60 * 1000;
  const medios = ["EFECTIVO", "TRANSFERENCIA", "TRANSFERENCIA", "TARJETA"];

  // Días que le quedan a cada estudiante (negativo = vencida, null = sin
  // pagos). La cuenta demo queda al día; dos estudiantes quedan en mora y una
  // recién llegada todavía no ha pagado, para que el panel muestre los tres casos.
  const diasRestantes = {
    "estudiante@ritmocentral.test": 18,
    "tomas@ritmocentral.test": -6,
    "emilio@ritmocentral.test": -15,
    "gabriela@ritmocentral.test": null,
  };
  let totalPagos = 0;
  for (const [i, estudiante] of estudiantes.entries()) {
    const restantes = estudiante.email in diasRestantes ? diasRestantes[estudiante.email] : 3 + ((i * 7) % 26);
    if (restantes === null) continue;

    const tarifa = i % 5 === 3 ? tarifas[2] : i % 3 === 1 ? tarifas[1] : tarifas[0];
    // Historial de unos tres meses hacia atrás: cada pago empieza donde
    // terminó el anterior y se registró ese mismo día.
    const cantidad = Math.max(1, Math.round(90 / tarifa.duracionDias));
    let hasta = new Date(Date.now() + restantes * UN_DIA);
    const pagos = [];
    for (let n = 0; n < cantidad; n++) {
      const desde = new Date(hasta.getTime() - tarifa.duracionDias * UN_DIA);
      pagos.push({
        tenantId: academia.id,
        estudianteId: estudiante.id,
        tarifaId: tarifa.id,
        nombreTarifa: tarifa.nombre,
        monto: tarifa.valor,
        duracionDias: tarifa.duracionDias,
        medio: medios[Math.floor(aleatorio() * medios.length)],
        vigenteDesde: desde,
        vigenteHasta: hasta,
        registradoPorId: admin.id,
        registradoEn: desde,
      });
      hasta = desde;
    }
    await prisma.pago.createMany({ data: pagos });
    totalPagos += pagos.length;
  }

  // --- Otras academias, para el panel del SuperAdmin ---------------------------
  const otras = [
    { nombre: "Son de Barrio Escuela de Baile", nit: "901456789-2", estado: "ACTIVA", admin: "admin@sondebarrio.test" },
    { nombre: "Estudio Danza Norte", nit: "901987654-3", estado: "SUSPENDIDA", admin: "admin@danzanorte.test" },
  ];
  for (const o of otras) {
    const tenant = await prisma.tenant.upsert({
      where: { nit: o.nit },
      update: { estado: o.estado },
      create: { nombre: o.nombre, nit: o.nit, estado: o.estado },
    });
    await upsertUsuario(tenant.id, `Admin ${o.nombre}`, o.admin, "ADMIN_ACADEMIA", passwordHash);
  }

  console.log(`Demo lista: ${totalClases} clases, ${totalReservas} reservas y ${totalPagos} pagos en ${academia.nombre}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
