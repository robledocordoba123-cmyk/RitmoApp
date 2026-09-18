import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, CalendarDays, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

function esHoy(fecha) {
  const hoy = new Date();
  const f = new Date(fecha);
  return f.getUTCFullYear() === hoy.getUTCFullYear() && f.getUTCMonth() === hoy.getUTCMonth() && f.getUTCDate() === hoy.getUTCDate();
}

export default function DashboardPage() {
  const { token, usuario } = useAuth();
  const [misClases, setMisClases] = useState(null);

  useEffect(() => {
    api.get("/clases", token).then((data) => setMisClases(data.filter((c) => c.profesor.id === usuario.id)));
  }, []);

  if (!misClases) {
    return (
      <div>
        <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Tus clases de hoy y las próximas." />
        <SkeletonList filas={3} />
      </div>
    );
  }

  const clasesHoy = misClases.filter((c) => esHoy(c.fechaHoraInicio));
  const proximas = [...misClases]
    .filter((c) => new Date(c.fechaHoraInicio) > new Date())
    .sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio))
    .slice(0, 5);

  return (
    <div>
      <PageHeader title={`Hola, ${usuario?.nombre?.split(" ")[0] || ""}`} subtitle="Tus clases de hoy y las próximas." />

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <StatCard icon={CalendarDays} label="Clases de hoy" value={clasesHoy.length} tone="indigo" />
        <StatCard icon={ClipboardList} label="Clases programadas" value={misClases.length} tone="green" />
      </div>

      <Card>
        <CardHeader
          title="Clases de hoy"
          action={
            <Link to="/profesor/clases" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
              Ver todas mis clases <ArrowRight size={14} />
            </Link>
          }
        />
        <CardBody>
          {clasesHoy.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No tienes clases hoy" description="Aquí verás las clases del día para tomar asistencia." />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {clasesHoy.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {c.ritmo.nombre} · {c.salon.nombre}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(c.fechaHoraInicio).toLocaleTimeString("es-CO", { timeStyle: "short" })}
                    </p>
                  </div>
                  <Link to={`/profesor/clases/${c.id}/asistencia`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                    Tomar asistencia
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
