import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HORA_INICIO = 6; // 06:00
const HORA_FIN = 22; // 22:00
const ALTURA_HORA = 56; // px por hora
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Paleta categórica fija: el mismo ritmo siempre cae en el mismo color
// mientras no cambie el orden en que aparece por primera vez.
const PALETA = [
  { bg: "bg-indigo-500", ring: "ring-indigo-600" },
  { bg: "bg-violet-500", ring: "ring-violet-600" },
  { bg: "bg-sky-500", ring: "ring-sky-600" },
  { bg: "bg-teal-500", ring: "ring-teal-600" },
  { bg: "bg-amber-500", ring: "ring-amber-600" },
  { bg: "bg-rose-500", ring: "ring-rose-600" },
];
const COLOR_RESERVA = { bg: "bg-gray-400", ring: "ring-gray-500" };

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha);
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarDias(fecha, n) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}

export default function WeekCalendar({ clases }) {
  const [inicioSemana, setInicioSemana] = useState(() => lunesDeLaSemana(new Date()));

  const colorPorRitmo = useMemo(() => {
    const mapa = new Map();
    let i = 0;
    for (const c of clases) {
      if (!mapa.has(c.ritmo.nombre)) {
        mapa.set(c.ritmo.nombre, PALETA[i % PALETA.length]);
        i++;
      }
    }
    return mapa;
  }, [clases]);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)), [inicioSemana]);
  const horas = useMemo(() => Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i), []);

  const clasesPorDia = useMemo(() => {
    const mapa = new Map(dias.map((d) => [d.toDateString(), []]));
    for (const c of clases) {
      const inicio = new Date(c.fechaHoraInicio);
      const clave = inicio.toDateString();
      if (mapa.has(clave)) mapa.get(clave).push(c);
    }
    return mapa;
  }, [clases, dias]);

  function posicion(clase) {
    const inicio = new Date(clase.fechaHoraInicio);
    const fin = new Date(clase.fechaHoraFin);
    const minutosDesdeInicio = (inicio.getHours() - HORA_INICIO) * 60 + inicio.getMinutes();
    const duracionMin = Math.max((fin - inicio) / 60000, 30);
    return {
      top: (minutosDesdeInicio / 60) * ALTURA_HORA,
      height: (duracionMin / 60) * ALTURA_HORA - 2,
    };
  }

  const hoy = new Date().toDateString();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setInicioSemana((s) => sumarDias(s, -7))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {inicioSemana.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} —{" "}
          {sumarDias(inicioSemana, 6).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button
          onClick={() => setInicioSemana((s) => sumarDias(s, 7))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px] grid grid-cols-[48px_repeat(7,1fr)]">
          <div className="border-r border-gray-100 dark:border-gray-800" />
          {dias.map((d) => (
            <div
              key={d.toDateString()}
              className={`text-center py-2 border-r border-b border-gray-100 dark:border-gray-800 last:border-r-0 ${
                d.toDateString() === hoy ? "bg-indigo-50/60 dark:bg-indigo-950/40" : ""
              }`}
            >
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">{DIAS[(d.getDay() + 6) % 7]}</p>
              <p className={`text-sm font-medium ${d.toDateString() === hoy ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>
                {d.getDate()}
              </p>
            </div>
          ))}

          <div className="relative border-r border-gray-100 dark:border-gray-800">
            {horas.map((h) => (
              <div key={h} style={{ height: ALTURA_HORA }} className="text-right pr-1.5 -mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                {h}:00
              </div>
            ))}
          </div>

          {dias.map((d) => (
            <div
              key={d.toDateString()}
              className="relative border-r border-gray-100 dark:border-gray-800 last:border-r-0"
              style={{ height: ALTURA_HORA * horas.length }}
            >
              {horas.map((h) => (
                <div key={h} style={{ height: ALTURA_HORA }} className="border-b border-gray-50 dark:border-gray-800/60" />
              ))}

              {(clasesPorDia.get(d.toDateString()) || []).map((c) => {
                const { top, height } = posicion(c);
                const color = c.estado === "CANCELADA" ? COLOR_RESERVA : colorPorRitmo.get(c.ritmo.nombre) || PALETA[0];
                return (
                  <div
                    key={c.id}
                    title={`${c.ritmo.nombre} · ${c.salon.nombre} · ${c.profesor.nombre}`}
                    className={`absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-white text-[11px] leading-tight overflow-hidden shadow-sm ${color.bg} ${
                      c.estado === "CANCELADA" ? "opacity-50 line-through" : ""
                    }`}
                    style={{ top, height: Math.max(height, 18) }}
                  >
                    <p className="font-medium truncate">{c.ritmo.nombre}</p>
                    {height > 30 && <p className="truncate opacity-90">{c.salon.nombre}</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
