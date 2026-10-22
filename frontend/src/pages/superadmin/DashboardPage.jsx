import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, XCircle, Users2, ArrowRight } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { SkeletonList } from "../../components/ui/Skeleton";

// UI-22 · HU-02: panorama de la plataforma para el SuperAdmin (academias
// totales, activas, suspendidas y usuarios), calculado con la misma lista de
// academias que usa UI-23.
export default function DashboardPage() {
  const { token } = useAuth();
  const [tenants, setTenants] = useState(null);

  useEffect(() => {
    api.get("/superadmin/tenants", token).then(setTenants).catch((err) => toast.error(err.message));
  }, []);

  if (!tenants) {
    return (
      <div>
        <PageHeader title="Panorama de la plataforma" subtitle="Estado global de las academias registradas." />
        <SkeletonList filas={3} />
      </div>
    );
  }

  const activas = tenants.filter((t) => t.estado === "ACTIVA").length;
  const suspendidas = tenants.length - activas;
  const totalUsuarios = tenants.reduce((acc, t) => acc + t._count.usuarios, 0);

  return (
    <div>
      <PageHeader
        title="Panorama de la plataforma"
        subtitle="Estado global de las academias registradas."
        action={
          <Link to="/superadmin/academias" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
            Gestionar academias <ArrowRight size={14} />
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Academias totales" value={tenants.length} tone="indigo" />
        <StatCard icon={CheckCircle2} label="Activas" value={activas} tone="green" />
        <StatCard icon={XCircle} label="Suspendidas" value={suspendidas} tone="rose" />
        <StatCard icon={Users2} label="Usuarios en la plataforma" value={totalUsuarios} tone="amber" />
      </div>
    </div>
  );
}
