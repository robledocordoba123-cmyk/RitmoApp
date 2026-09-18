import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, ClipboardCheck, Save } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

const ESTADOS = ["ASISTIO", "INASISTENCIA", "EXCUSA"];
const ETIQUETA = { ASISTIO: "Asistió", INASISTENCIA: "Inasistencia", EXCUSA: "Excusa" };
const COLOR = { ASISTIO: "text-green-700 bg-green-50", INASISTENCIA: "text-red-700 bg-red-50", EXCUSA: "text-amber-700 bg-amber-50" };

export default function AsistenciaPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [inscritos, setInscritos] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const data = await api.get(`/clases/${id}/inscritos`, token);
    setInscritos(data);
    setSeleccion(Object.fromEntries(data.map((i) => [i.estudianteId, i.estadoAsistencia || "ASISTIO"])));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post(
        `/clases/${id}/asistencia`,
        { asistencias: Object.entries(seleccion).map(([estudianteId, estado]) => ({ estudianteId, estado })) },
        token
      );
      toast.success("Asistencia guardada.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <Link to="/profesor/clases" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2">
        <ArrowLeft size={14} /> Volver a mis clases
      </Link>
      <PageHeader title="Registrar asistencia" />

      {inscritos === null ? (
        <SkeletonList />
      ) : inscritos.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nadie ha reservado esta clase todavía" />
      ) : (
        <form onSubmit={guardar}>
          <Card className="mb-4">
            <CardBody className="pt-5 divide-y divide-gray-100">
              {inscritos.map((i) => (
                <div key={i.estudianteId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{i.nombre}</p>
                    <p className="text-sm text-gray-500">{i.email}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {ESTADOS.map((estado) => (
                      <button
                        type="button"
                        key={estado}
                        onClick={() => setSeleccion((prev) => ({ ...prev, [i.estudianteId]: estado }))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          seleccion[i.estudianteId] === estado ? COLOR[estado] : "text-gray-400 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        {ETIQUETA[estado]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Button type="submit" icon={Save} disabled={guardando}>
            Guardar asistencia
          </Button>
        </form>
      )}
    </div>
  );
}
