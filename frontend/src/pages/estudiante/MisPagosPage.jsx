import { useEffect, useState } from "react";
import { Receipt, Wallet } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import AvisoMembresia from "../../components/AvisoMembresia";
import { pesos, fecha, MEDIOS_DE_PAGO, ESTADOS_MEMBRESIA } from "../../utils/formato";

// RF-12 · HU-12: estado de la membresía e historial de pagos del estudiante.
export default function MisPagosPage() {
  const { token } = useAuth();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    api.get("/pagos/mios", token).then(setDatos);
  }, []);

  if (!datos) {
    return (
      <div>
        <PageHeader title="Mis pagos" subtitle="El estado de tu membresía y los pagos que ha registrado la academia." />
        <SkeletonList filas={3} />
      </div>
    );
  }

  const { membresia, pagos } = datos;
  const estado = ESTADOS_MEMBRESIA[membresia.estado];

  return (
    <div>
      <PageHeader title="Mis pagos" subtitle="El estado de tu membresía y los pagos que ha registrado la academia." />

      <AvisoMembresia membresia={membresia} conEnlace={false} />

      <Card className="mb-6">
        <CardBody className="pt-5 flex flex-wrap items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <Wallet size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Estado de tu membresía</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {membresia.estado === "AL_DIA" ? `Vigente hasta el ${fecha(membresia.vigenteHasta)}` : estado.texto}
            </p>
          </div>
          <Badge color={estado.color}>{estado.texto}</Badge>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Historial de pagos" />
        <CardBody>
          {pagos.length === 0 ? (
            <EmptyState icon={Receipt} title="Aún no tienes pagos registrados" description="Cuando pagues en la academia, el administrador lo registrará y aparecerá aquí." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Plan</th>
                    <th className="py-2 font-medium">Medio</th>
                    <th className="py-2 font-medium">Cubre</th>
                    <th className="py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <td className="py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fecha(p.registradoEn)}</td>
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{p.nombreTarifa}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {MEDIOS_DE_PAGO[p.medio]}
                        {p.referencia && <span className="text-gray-400"> · {p.referencia}</span>}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {fecha(p.vigenteDesde)} – {fecha(p.vigenteHasta)}
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{pesos(p.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
