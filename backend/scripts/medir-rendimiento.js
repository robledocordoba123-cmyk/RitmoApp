// AM-06 (DOC-07) · RNF-04: "Con la API activa, las consultas del catálogo y de
// las reservas responden en menos de 1,5 segundos."
//
// Mide el tiempo de respuesta de las consultas que hace el estudiante (catálogo,
// mis reservas y mis pagos) contra una API ya desplegada. Primero despierta la
// API con /health (el plan gratuito de Render la apaga) y descarta esa espera,
// porque el requisito habla de la API activa.
//
// Uso:
//   API_URL=https://ritmoapp-api.onrender.com/api \
//   EMAIL=estudiante@ritmocentral.test PASSWORD=... node scripts/medir-rendimiento.js
//
// Opcional: REPETICIONES (30 por defecto) y SALIDA=archivo.json para guardar el detalle.
const fs = require("fs");

const API_URL = (process.env.API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const { EMAIL, PASSWORD } = process.env;
const REPETICIONES = Number(process.env.REPETICIONES || 30);
const LIMITE_MS = 1500;

const CONSULTAS = [
  { nombre: "Catálogo de clases", ruta: "/clases?soloFuturas=true" },
  { nombre: "Mis reservas", ruta: "/reservas/mias" },
  { nombre: "Mis pagos y membresía", ruta: "/pagos/mios" },
];

async function cronometrar(url, opciones) {
  const inicio = performance.now();
  const res = await fetch(url, opciones);
  await res.arrayBuffer();
  return { ms: performance.now() - inicio, status: res.status };
}

function percentil(valores, p) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)];
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error("Faltan EMAIL y PASSWORD de una cuenta de estudiante.");

  // 1. Despertar la API (no cuenta para el requisito).
  const despertar = await cronometrar(`${API_URL}/health`);
  console.log(`API: ${API_URL}\nDespertar la API: ${Math.round(despertar.ms)} ms (no cuenta)\n`);

  // 2. Iniciar sesión una sola vez, para no gastar el límite de intentos.
  const login = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`No se pudo iniciar sesión (${login.status}).`);
  const { token } = await login.json();
  const opciones = { headers: { Authorization: `Bearer ${token}` } };

  // 3. Medir cada consulta, una petición a la vez.
  const resultados = [];
  for (const consulta of CONSULTAS) {
    const tiempos = [];
    for (let i = 0; i < REPETICIONES; i++) {
      const { ms, status } = await cronometrar(`${API_URL}${consulta.ruta}`, opciones);
      if (status !== 200) throw new Error(`${consulta.nombre} respondió ${status}.`);
      tiempos.push(ms);
    }
    const fila = {
      consulta: consulta.nombre,
      ruta: consulta.ruta,
      peticiones: tiempos.length,
      medianaMs: Math.round(percentil(tiempos, 50)),
      p95Ms: Math.round(percentil(tiempos, 95)),
      maximoMs: Math.round(Math.max(...tiempos)),
      cumple: percentil(tiempos, 95) < LIMITE_MS,
    };
    resultados.push({ ...fila, tiemposMs: tiempos.map(Math.round) });
    console.log(
      `${fila.cumple ? "CUMPLE  " : "NO CUMPLE"} ${fila.consulta.padEnd(24)} mediana ${String(fila.medianaMs).padStart(5)} ms · p95 ${String(fila.p95Ms).padStart(5)} ms · máximo ${String(fila.maximoMs).padStart(5)} ms`
    );
  }

  const cumpleTodo = resultados.every((r) => r.cumple);
  console.log(`\nCriterio: el percentil 95 de cada consulta debe estar por debajo de ${LIMITE_MS} ms.`);
  console.log(cumpleTodo ? "RNF-04 CUMPLE" : "RNF-04 NO CUMPLE");

  if (process.env.SALIDA) {
    fs.writeFileSync(
      process.env.SALIDA,
      JSON.stringify({ fecha: new Date().toISOString(), api: API_URL, repeticiones: REPETICIONES, limiteMs: LIMITE_MS, cumpleTodo, resultados }, null, 2)
    );
  }
  process.exitCode = cumpleTodo ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
