import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, DoorOpen, CalendarDays, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function MisClasesPage() {
  const { token, usuario } = useAuth();
  const [clases, setClases] = useState(null);

  useEffect(() => {
    api.get("/clases", token).then((data) => setClases(data.filter((c) => c.profesor.id === usuario.id)));
  }, []);

  return (
    <div>
      <PageHeader title="Mis clases" subtitle="Tus clases programadas y el registro de asistencia." />

      {clases === null ? (
        <SkeletonList />
      ) : clases.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No tienes clases programadas" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clases.map((c) => (
            <Card key={c.id}>
              <CardBody className="pt-5">
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.ritmo.nombre}</p>
                <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p className="flex items-center gap-1.5">
                    <DoorOpen size={14} /> {c.salon.nombre}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {new Date(c.fechaHoraInicio).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <Link
                  to={`/profesor/clases/${c.id}/asistencia`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Tomar asistencia <ArrowRight size={14} />
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
