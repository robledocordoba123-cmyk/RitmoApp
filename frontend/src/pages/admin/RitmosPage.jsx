import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Music4, Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function RitmosPage() {
  const { token } = useAuth();
  const [ritmos, setRitmos] = useState(null);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setRitmos(await api.get("/ritmos", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post("/ritmos", { nombre }, token);
      setNombre("");
      toast.success("Ritmo agregado.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/ritmos/${id}`, token);
      toast.success("Ritmo eliminado.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Ritmos" subtitle="Los estilos de baile que ofrece tu academia." />

      <Card className="mb-6">
        <CardHeader title="Agregar ritmo" />
        <CardBody>
          <form onSubmit={crear} className="flex flex-col sm:flex-row gap-3">
            <input
              placeholder="Ej. Salsa, Bachata, Kizomba..."
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <Button type="submit" icon={Plus} disabled={enviando}>
              Agregar
            </Button>
          </form>
        </CardBody>
      </Card>

      {ritmos === null ? (
        <SkeletonList />
      ) : ritmos.length === 0 ? (
        <EmptyState icon={Music4} title="Todavía no tienes ritmos" description="Agrega el primero con el formulario de arriba." />
      ) : (
        <div className="flex flex-wrap gap-3">
          {ritmos.map((r) => (
            <div key={r.id} className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-3 pr-2 py-1.5 dark:border-gray-800">
              <Music4 size={14} className="text-indigo-500" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.nombre}</span>
              <button
                onClick={() => eliminar(r.id)}
                className="text-gray-300 group-hover:text-red-500 transition ml-1"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
