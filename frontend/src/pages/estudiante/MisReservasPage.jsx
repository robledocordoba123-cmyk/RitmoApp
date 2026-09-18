import { useEffect, useState } from "react";
import { Ticket, DoorOpen, CalendarDays } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function MisReservasPage() {
  const { token } = useAuth();
  const [reservas, setReservas] = useState(null);

  useEffect(() => {
    api.get("/reservas/mias", token).then(setReservas);
  }, []);

  return (
    <div>
      <PageHeader title="Mis reservas" subtitle="Las clases en las que ya tienes cupo." />

      {reservas === null ? (
        <SkeletonList />
      ) : reservas.length === 0 ? (
        <EmptyState icon={Ticket} title="Todavía no tienes reservas" description="Ve al catálogo y reserva tu primera clase." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {reservas.map((r) => (
            <Card key={r.id}>
              <CardBody className="pt-5">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900">{r.clase.ritmo.nombre}</p>
                  <Badge color={r.estado === "CONFIRMADA" ? "green" : "gray"}>{r.estado}</Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <p className="flex items-center gap-1.5">
                    <DoorOpen size={14} /> {r.clase.salon.nombre}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {new Date(r.clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
