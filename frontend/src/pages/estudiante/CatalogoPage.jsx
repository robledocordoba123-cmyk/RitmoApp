import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays, DoorOpen, User, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function CatalogoPage() {
  const { token } = useAuth();
  const [clases, setClases] = useState(null);
  const [reservandoId, setReservandoId] = useState(null);

  async function cargar() {
    // Solo las clases que aún no empiezan: las pasadas ya no se pueden reservar.
    const ahora = new Date();
    const todas = await api.get("/clases", token);
    setClases(todas.filter((clase) => new Date(clase.fechaHoraInicio) > ahora));
  }

  useEffect(() => {
    cargar();
  }, []);

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

      {clases === null ? (
        <SkeletonList />
      ) : clases.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No hay clases programadas todavía" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clases.map((clase) => {
            const sinCupo = clase.cuposDisponibles === 0;
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
                    {sinCupo ? "Sin cupos disponibles" : `${clase.cuposDisponibles} cupos disponibles de ${clase.cupoMaximo}`}
                  </p>

                  <button
                    onClick={() => reservar(clase.id)}
                    disabled={sinCupo || reservandoId === clase.id}
                    className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {sinCupo ? "Sin cupos" : reservandoId === clase.id ? "Reservando..." : "Reservar"}
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
