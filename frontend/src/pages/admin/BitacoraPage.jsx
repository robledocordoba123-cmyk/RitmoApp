import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, XCircle } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

const ROLES = {
  ADMIN_ACADEMIA: { texto: "Administrador", color: "indigo" },
  PROFESOR: { texto: "Profesor", color: "amber" },
  ESTUDIANTE: { texto: "Estudiante", color: "green" },
};

// UI-25 · HU-21: bitácora de auditoría. El administrador ve quién hizo cada
// cambio en su academia y cuándo (los últimos 200 movimientos, del más
// reciente al más antiguo). Puede buscar por persona, acción o detalle.
export default function BitacoraPage() {
  const { token } = useAuth();
  const [movimientos, setMovimientos] = useState(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    api.get("/bitacora", token).then(setMovimientos).catch((err) => setError(err.message));
  }, [token]);

  const filtrados = useMemo(() => {
    if (!movimientos) return [];
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return movimientos;
    return movimientos.filter((m) => [m.usuario.nombre, m.accion, m.detalle].some((v) => v && v.toLowerCase().includes(texto)));
  }, [movimientos, busqueda]);

  const encabezado = <PageHeader title="Bitácora" subtitle="Quién hizo cada cambio en tu academia y cuándo." />;

  if (error) {
    return (
      <div>
        {encabezado}
        <EmptyState icon={XCircle} title="No se pudo cargar la bitácora" description={error} />
      </div>
    );
  }

  if (!movimientos) {
    return (
      <div>
        {encabezado}
        <SkeletonList filas={4} />
      </div>
    );
  }

  return (
    <div>
      {encabezado}

      <Card>
        <CardHeader title="Últimos movimientos" />
        <CardBody>
          {movimientos.length === 0 ? (
            <EmptyState icon={ScrollText} title="Sin registros" description="Cuando tú o tu equipo hagan cambios (clases, pagos, usuarios…), aparecerán aquí." />
          ) : (
            <>
              <label className="relative block mb-4 max-w-sm">
                <span className="sr-only">Buscar en la bitácora</span>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por persona, acción o detalle"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              {filtrados.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Ningún movimiento coincide con “{busqueda}”.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="py-2 font-medium">Fecha y hora</th>
                        <th className="py-2 font-medium">Quién</th>
                        <th className="py-2 font-medium">Acción</th>
                        <th className="py-2 font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map((m) => {
                        const rol = ROLES[m.usuario.rol] || { texto: m.usuario.rol, color: "gray" };
                        return (
                          <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                            <td className="py-2 pr-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {new Date(m.fecha).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{m.usuario.nombre}</span>{" "}
                              <Badge color={rol.color}>{rol.texto}</Badge>
                            </td>
                            <td className="py-2 pr-3 text-gray-900 dark:text-gray-100">{m.accion}</td>
                            <td className="py-2 text-gray-600 dark:text-gray-400">{m.detalle || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
