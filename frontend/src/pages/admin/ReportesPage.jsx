import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BarChart3, Search, Table2, Wallet } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import OcupacionChart from "../../components/OcupacionChart";
import { pesos, MEDIOS_DE_PAGO } from "../../utils/formato";

function primerDiaDelMes() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
}
// Fecha local, no UTC: toISOString() después de las 7:00 p. m. en Colombia
// ya devuelve el día de mañana.
function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function ReportesPage() {
  const { token } = useAuth();
  const [desde, setDesde] = useState(primerDiaDelMes());
  const [hasta, setHasta] = useState(hoyISO());
  const [reporte, setReporte] = useState(null);
  const [ingresos, setIngresos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [verTabla, setVerTabla] = useState(false);

  async function consultar(e) {
    e?.preventDefault();
    setCargando(true);
    try {
      const rango = `desde=${desde}&hasta=${hasta}`;
      const [ocupacion, dinero] = await Promise.all([
        api.get(`/reportes/ocupacion?${rango}`, token),
        api.get(`/reportes/ingresos?${rango}`, token),
      ]);
      setReporte(ocupacion);
      setIngresos(dinero);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Al entrar se muestra de una vez el mes en curso, sin tener que darle a "Consultar".
  useEffect(() => {
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Ocupación de cada salón e ingresos de la academia en el rango que elijas." />

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
            <CardHeader
              title="Ocupación por salón"
              subtitle={`${reporte.desde} — ${reporte.hasta}`}
              action={
                <button
                  onClick={() => setVerTabla((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Table2 size={15} /> {verTabla ? "Ver gráfica" : "Ver tabla"}
                </button>
              }
            />
            <CardBody>
              {verTabla ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="py-2 font-medium">Salón</th>
                        <th className="py-2 font-medium">Clases</th>
                        <th className="py-2 font-medium">Reservas</th>
                        <th className="py-2 font-medium">Capacidad</th>
                        <th className="py-2 font-medium text-right">Ocupación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.salones.map((s) => (
                        <tr key={s.salonId} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                          <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{s.salon}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{s.totalClases}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{s.reservasConfirmadas}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{s.capacidadOfertada}</td>
                          <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{s.porcentajeOcupacion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <OcupacionChart datos={reporte.salones} />
              )}
            </CardBody>
          </Card>
        ))}

      {ingresos && (
        <Card className="mt-6">
          <CardHeader title="Ingresos" subtitle={`${ingresos.desde} — ${ingresos.hasta}`} />
          <CardBody>
            {ingresos.cantidadPagos === 0 ? (
              <EmptyState icon={Wallet} title="Sin pagos en ese rango" description="No se registraron pagos entre esas fechas." />
            ) : (
              <>
                <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{pesos(ingresos.total)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  {ingresos.cantidadPagos === 1 ? "1 pago registrado" : `${ingresos.cantidadPagos} pagos registrados`}
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  {[
                    { titulo: "Por tarifa", filas: ingresos.porTarifa.map((t) => ({ nombre: t.nombreTarifa, ...t })) },
                    { titulo: "Por medio de pago", filas: ingresos.porMedio.map((m) => ({ nombre: MEDIOS_DE_PAGO[m.medio], ...m })) },
                  ].map((grupo) => (
                    <div key={grupo.titulo}>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{grupo.titulo}</h3>
                      <ul className="space-y-2">
                        {grupo.filas.map((fila) => (
                          <li key={fila.nombre}>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                {fila.nombre} <span className="text-gray-400">({fila.pagos})</span>
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{pesos(fila.total)}</span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                                style={{ width: `${Math.round((fila.total / ingresos.total) * 100)}%` }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
