import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket, CalendarDays, ArrowRight, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import AvisoMembresia from "../../components/AvisoMembresia";

export default function DashboardPage() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/clases", token), api.get("/reservas/mias", token), api.get("/pagos/mios", token)]).then(
      ([clases, reservas, pagos]) => setDatos({ clases, reservas, membresia: pagos.membresia })
    );
  }, []);

  if (!datos) {
    return (
      <div>
        <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Tu próxima clase te espera." />
        <SkeletonList filas={3} />
      </div>
    );
  }

  const { reservas } = datos;
  const ahora = new Date();
  // El catálogo y las reservas activas cuentan solo clases que aún no empiezan.
  const clases = datos.clases.filter((c) => new Date(c.fechaHoraInicio) > ahora);
  // Activa = confirmada, la clase no fue cancelada por la academia y todavía no pasa.
  const reservasActivas = reservas.filter(
    (r) => r.estado === "CONFIRMADA" && r.clase.estado !== "CANCELADA" && new Date(r.clase.fechaHoraInicio) > ahora
  );
  const proximaReserva = [...reservasActivas]
    .sort((a, b) => new Date(a.clase.fechaHoraInicio) - new Date(b.clase.fechaHoraInicio))[0];
  const conCupo = clases.filter((c) => c.cuposDisponibles > 0).length;

  return (
    <div>
      <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Tu próxima clase te espera." />

      <AvisoMembresia membresia={datos.membresia} />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Ticket} label="Reservas activas" value={reservasActivas.length} tone="indigo" />
        <StatCard icon={CalendarDays} label="Clases con cupo" value={conCupo} tone="green" hint="disponibles ahora mismo" />
        <StatCard icon={Sparkles} label="Clases en el catálogo" value={clases.length} tone="amber" />
      </div>

      <Card>
        <CardHeader
          title="Tu próxima clase"
          action={
            <Link to="/estudiante/catalogo" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
              Ir al catálogo <ArrowRight size={14} />
            </Link>
          }
        />
        <CardBody>
          {proximaReserva ? (
            <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
              <p className="font-medium text-gray-900 dark:text-gray-100">{proximaReserva.clase.ritmo.nombre}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{proximaReserva.clase.salon.nombre}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(proximaReserva.clase.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          ) : (
            <EmptyState
              icon={Ticket}
              title="Todavía no tienes reservas"
              description="Explora el catálogo y reserva tu cupo en la clase que quieras."
              action={
                <Link to="/estudiante/catalogo" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:to-fuchsia-600">
                  Ver catálogo <ArrowRight size={14} />
                </Link>
              }
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
