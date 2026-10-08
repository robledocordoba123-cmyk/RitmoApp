import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, DoorOpen, User, Sparkles, SearchX } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import AvisoMembresia from "../../components/AvisoMembresia";

export default function CatalogoPage() {
  const { token } = useAuth();
  const [clases, setClases] = useState(null);
  const [reservandoId, setReservandoId] = useState(null);
  const [membresia, setMembresia] = useState(null);
  // RF-08 · HU-08: filtros por ritmo y por día. Los aplica la API.
  const [filtros, setFiltros] = useState({ ritmoId: "", fecha: "" });
  const [ritmos, setRitmos] = useState([]);
  const hayFiltros = Boolean(filtros.ritmoId || filtros.fecha);

  async function cargar() {
    // Solo las clases que aún no empiezan: las pasadas ya no se pueden reservar.
    const parametros = new URLSearchParams({ soloFuturas: "true" });
    if (filtros.ritmoId) parametros.set("ritmoId", filtros.ritmoId);
    if (filtros.fecha) parametros.set("fecha", filtros.fecha);
    const [lista, pagos] = await Promise.all([api.get(`/clases?${parametros}`, token), api.get("/pagos/mios", token)]);
    setClases(lista);
    setMembresia(pagos.membresia);
    // Las opciones de ritmo salen de la primera carga, sin filtros.
    if (!hayFiltros) {
      setRitmos([...new Map(lista.map((c) => [c.ritmo.id, c.ritmo])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  async function reservar(claseId) {
    setReservandoId(claseId);
    try {
      await api.post("/reservas", { claseId }, token);
      toast.success("¡Reserva confirmada!");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReservandoId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Catálogo de clases" subtitle="Elige tu ritmo y reserva tu cupo en un clic." />

      <AvisoMembresia membresia={membresia} />

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Ritmo
          <select
            value={filtros.ritmoId}
            onChange={(e) => setFiltros({ ...filtros, ritmoId: e.target.value })}
            className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los ritmos</option>
            {ritmos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
          Día
          <input
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
            className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => setFiltros({ ritmoId: "", fecha: "" })}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 pb-2"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {clases === null ? (
        <SkeletonList />
      ) : clases.length === 0 ? (
        hayFiltros ? (
          <EmptyState icon={SearchX} title="Sin resultados" description="No hay clases con esos filtros. Prueba con otro ritmo u otro día." />
        ) : (
          <EmptyState icon={CalendarDays} title="No hay clases programadas todavía" />
        )
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clases.map((clase) => {
            const sinCupo = clase.cuposDisponibles === 0;
            // RN-05: sin membresía vigente el botón se desactiva desde antes;
            // la API igual lo rechaza si alguien intenta saltárselo.
            const bloqueada = membresia !== null && membresia.estado !== "AL_DIA";
            return (
              <Card hover key={clase.id}>
                <CardBody className="pt-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 mb-3">
                    <Sparkles size={16} />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{clase.ritmo.nombre}</p>
                  <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1.5">
                      <DoorOpen size={14} /> {clase.salon.nombre}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <User size={14} /> {clase.profesor.nombre}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      {new Date(clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>

                  <p className={`text-sm mt-3 font-medium ${sinCupo ? "text-red-500" : "text-green-600"}`}>
                    {sinCupo
                      ? "Sin cupos disponibles"
                      : `${clase.cuposDisponibles} ${clase.cuposDisponibles === 1 ? "cupo disponible" : "cupos disponibles"} de ${clase.cupoMaximo}`}
                  </p>

                  <button
                    onClick={() => reservar(clase.id)}
                    disabled={sinCupo || bloqueada || reservandoId === clase.id}
                    className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {sinCupo ? "Sin cupos" : bloqueada ? "Membresía vencida" : reservandoId === clase.id ? "Reservando..." : "Reservar"}
                  </button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
