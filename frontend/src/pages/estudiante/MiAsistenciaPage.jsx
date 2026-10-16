import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, XCircle, FileText, Percent } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

// Texto y color de cada estado de asistencia. null = el profesor todavía no la registró.
const ESTADOS = {
  ASISTIO: { texto: "Asistió", color: "green" },
  INASISTENCIA: { texto: "Faltó", color: "red" },
  EXCUSA: { texto: "Excusa", color: "amber" },
  null: { texto: "Sin registrar", color: "gray" },
};

// UI-24 · HU-11: historial de asistencia del estudiante. Muestra el porcentaje
// (solo cuenta las clases con asistencia registrada) y la lista de sus clases
// pasadas con su estado, de la más reciente a la más antigua.
export default function MiAsistenciaPage() {
  const { token } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/asistencias/mias", token).then(setDatos).catch((err) => setError(err.message));
  }, [token]);

  const encabezado = <PageHeader title="Mi asistencia" subtitle="Las clases a las que has ido y lo que registró tu profesor." />;

  if (error) {
    return (
      <div>
        {encabezado}
        <EmptyState icon={XCircle} title="No se pudo cargar tu historial" description={error} />
      </div>
    );
  }

  if (!datos) {
    return (
      <div>
        {encabezado}
        <SkeletonList filas={3} />
      </div>
    );
  }

  const { resumen, registros } = datos;

  return (
    <div>
      {encabezado}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Percent} label="% de asistencia" value={resumen.porcentajeAsistencia ?? 0} hint={resumen.porcentajeAsistencia === null ? "aún sin clases registradas" : "de las clases que tu profesor ya registró"} />
        <StatCard icon={CheckCircle2} label="Clases a las que fuiste" value={resumen.asistio} tone="green" />
        <StatCard icon={XCircle} label="Faltas" value={resumen.inasistencia} tone="rose" />
        <StatCard icon={FileText} label="Con excusa" value={resumen.excusa} tone="amber" />
      </div>

      <Card>
        <CardHeader title="Historial de clases" />
        <CardBody>
          {registros.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="Todavía no tienes historial" description="Cuando vayas a tus primeras clases, aquí verás tu asistencia." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Clase</th>
                    <th className="py-2 font-medium">Profesor</th>
                    <th className="py-2 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => {
                    const estado = ESTADOS[r.estado];
                    return (
                      <tr key={r.claseId} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                        <td className="py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(r.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                        <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                          {r.ritmo} <span className="font-normal text-gray-400">· {r.salon}</span>
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-400">{r.profesor}</td>
                        <td className="py-2 text-right">
                          <Badge color={estado.color}>{estado.texto}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
