import { useState } from "react";
import toast from "react-hot-toast";
import { BarChart3, Search } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

function primerDiaDelMes() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const { token } = useAuth();
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function consultar(e) {
    e.preventDefault();
    setCargando(true);
    try {
      const data = await api.get(`/reportes/ocupacion?desde=${desde}&hasta=${hasta}`, token);
      setReporte(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      <PageHeader title="Reporte de ocupación" subtitle="Cuánto se está usando cada salón en el rango que elijas." />

      <Card className="mb-6">
        <CardBody className="pt-5">
          <form onSubmit={consultar} className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-gray-600 flex flex-col gap-1 dark:text-gray-400">
              Desde
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
            </label>
            <label className="text-xs font-medium text-gray-600 flex flex-col gap-1 dark:text-gray-400">
              Hasta
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
            </label>
            <Button type="submit" icon={Search} disabled={cargando}>
              Consultar
            </Button>
          </form>
        </CardBody>
      </Card>

      {reporte &&
        (reporte.salones.length === 0 ? (
          <EmptyState icon={BarChart3} title="Sin datos en ese rango" description="No hubo clases programadas entre esas fechas." />
        ) : (
          <Card>
            <CardHeader title="Ocupación por salón" subtitle={`${reporte.desde} — ${reporte.hasta}`} />
            <CardBody className="space-y-5">
              {reporte.salones.map((s) => (
                <div key={s.salonId}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{s.salon}</p>
                    <p className="text-sm font-semibold text-indigo-600">{s.porcentajeOcupacion}%</p>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${Math.min(s.porcentajeOcupacion, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {s.reservasConfirmadas} reservas de {s.capacidadOfertada} cupos ofertados en {s.totalClases} clases
                  </p>
                </div>
              ))}
            </CardBody>
          </Card>
        ))}
    </div>
  );
}
