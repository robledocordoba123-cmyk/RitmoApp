import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Ticket, DoorOpen, CalendarDays, XCircle } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

// Lo que ve el estudiante combina el estado de su reserva con el de la clase:
// si la academia canceló la clase, la reserva sigue "CONFIRMADA" en BD pero
// para el estudiante lo importante es que la clase no va.
function estadoVisible(reserva) {
  if (reserva.estado === "CANCELADA") return { texto: "Cancelada por ti", color: "gray" };
  if (reserva.clase.estado === "CANCELADA") return { texto: "Clase cancelada", color: "red" };
  if (new Date(reserva.clase.fechaHoraInicio) <= new Date()) return { texto: "Finalizada", color: "gray" };
  return { texto: "Confirmada", color: "green" };
}

export default function MisReservasPage() {
  const { token } = useAuth();
  const [reservas, setReservas] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);

  const cargar = useCallback(() => api.get("/reservas/mias", token).then(setReservas), [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cancelar(reserva) {
    if (!window.confirm(`¿Cancelar tu reserva de ${reserva.clase.ritmo.nombre}? El cupo quedará libre para otra persona.`)) return;
    setCancelandoId(reserva.id);
    try {
      await api.patch(`/reservas/${reserva.id}/cancelar`, {}, token);
      toast.success("Reserva cancelada.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelandoId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Mis reservas" subtitle="Las clases en las que ya tienes cupo." />

      {reservas === null ? (
        <SkeletonList />
      ) : reservas.length === 0 ? (
        <EmptyState icon={Ticket} title="Todavía no tienes reservas" description="Ve al catálogo y reserva tu primera clase." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reservas.map((r) => {
            const estado = estadoVisible(r);
            return (
              <Card hover key={r.id}>
                <CardBody className="pt-5">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{r.clase.ritmo.nombre}</p>
                    <Badge color={estado.color}>{estado.texto}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1.5">
                      <DoorOpen size={14} /> {r.clase.salon.nombre}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      {new Date(r.clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  {estado.texto === "Confirmada" && (
                    <div className="mt-4">
                      <Button variant="danger" icon={XCircle} disabled={cancelandoId === r.id} onClick={() => cancelar(r)}>
                        {cancelandoId === r.id ? "Cancelando..." : "Cancelar reserva"}
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
