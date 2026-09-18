import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, DoorOpen, Music4, Ticket, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function DashboardPage() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/clases", token), api.get("/salones", token), api.get("/ritmos", token)]).then(
      ([clases, salones, ritmos]) => setDatos({ clases, salones, ritmos })
    );
  }, []);

  if (!datos) {
    return (
      <div>
        <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Este es el estado de tu academia." />
        <SkeletonList filas={3} />
      </div>
    );
  }

  const { clases, salones, ritmos } = datos;
  const cupoTotal = clases.reduce((acc, c) => acc + c.cupoMaximo, 0);
  const reservasTotal = clases.reduce((acc, c) => acc + (c.cupoMaximo - c.cuposDisponibles), 0);
  const ocupacion = cupoTotal === 0 ? 0 : Math.round((reservasTotal / cupoTotal) * 100);
  const proximas = [...clases]
    .filter((c) => new Date(c.fechaHoraInicio) > new Date())
    .sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio))
    .slice(0, 5);

  return (
    <div>
      <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Este es el estado de tu academia." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CalendarDays} label="Clases programadas" value={clases.length} tone="indigo" />
        <StatCard icon={Ticket} label="Reservas confirmadas" value={reservasTotal} tone="green" hint={`de ${cupoTotal} cupos ofertados`} />
        <StatCard icon={DoorOpen} label="Salones" value={salones.length} tone="amber" />
        <StatCard icon={Music4} label="Ritmos" value={ritmos.length} tone="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Próximas clases"
            action={
              <Link to="/admin/clases" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                Ver todas <ArrowRight size={14} />
              </Link>
            }
          />
          <CardBody>
            {proximas.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No hay clases próximas" description="Programa una clase para verla aquí." />
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {proximas.map((c) => (
                  <li key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {c.ritmo.nombre} · {c.salon.nombre}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(c.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {c.cuposDisponibles}/{c.cupoMaximo} cupos
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ocupación general" />
          <CardBody>
            <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{ocupacion}%</p>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.min(ocupacion, 100)}%` }} />
            </div>
            <p className="text-sm text-gray-500 mt-3 dark:text-gray-400">
              {reservasTotal} de {cupoTotal} cupos ocupados en total.
            </p>
            <Link to="/admin/reportes" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Ver reporte por salón <ArrowRight size={14} />
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
