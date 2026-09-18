import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2, Users2, Power } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function AcademiasPage() {
  const { token } = useAuth();
  const [academias, setAcademias] = useState(null);

  async function cargar() {
    setAcademias(await api.get("/superadmin/tenants", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function cambiarEstado(id, estado) {
    try {
      await api.patch(`/superadmin/tenants/${id}/estado`, { estado }, token);
      toast.success(estado === "ACTIVA" ? "Academia reactivada." : "Academia suspendida.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Academias registradas" subtitle="Activa o suspende el acceso de cada academia a la plataforma." />

      {academias === null ? (
        <SkeletonList />
      ) : academias.length === 0 ? (
        <EmptyState icon={Building2} title="Todavía no hay academias registradas" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {academias.map((t) => (
            <Card hover key={t.id}>
              <CardBody className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Building2 size={18} />
                  </div>
                  <Badge color={t.estado === "ACTIVA" ? "green" : "red"}>{t.estado}</Badge>
                </div>
                <p className="font-medium text-gray-900 mt-3 dark:text-gray-100">{t.nombre}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">NIT {t.nit}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1 dark:text-gray-400">
                  <Users2 size={14} /> {t._count.usuarios} usuarios
                </p>
                <button
                  onClick={() => cambiarEstado(t.id, t.estado === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA")}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <Power size={14} /> {t.estado === "ACTIVA" ? "Suspender" : "Reactivar"}
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
