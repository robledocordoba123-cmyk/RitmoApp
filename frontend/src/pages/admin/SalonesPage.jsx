import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DoorOpen, Plus, Trash2, Users } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

export default function SalonesPage() {
  const { token } = useAuth();
  const [salones, setSalones] = useState(null);
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setSalones(await api.get("/salones", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post("/salones", { nombre, capacidad: Number(capacidad) }, token);
      setNombre("");
      setCapacidad("");
      toast.success("Salón agregado.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/salones/${id}`, token);
      toast.success("Salón eliminado.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Salones" subtitle="Los espacios físicos donde se dictan las clases de tu academia." />

      <Card className="mb-6">
        <CardHeader title="Agregar salón" />
        <CardBody>
          <form onSubmit={crear} className="flex flex-col sm:flex-row gap-3">
            <input
              placeholder="Nombre del salón"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              min="1"
              placeholder="Capacidad"
              required
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              className="sm:w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" icon={Plus} disabled={enviando}>
              Agregar
            </Button>
          </form>
        </CardBody>
      </Card>

      {salones === null ? (
        <SkeletonList />
      ) : salones.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Todavía no tienes salones" description="Agrega el primero con el formulario de arriba." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salones.map((s) => (
            <Card key={s.id}>
              <CardBody className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <DoorOpen size={18} />
                  </div>
                  <button onClick={() => eliminar(s.id)} className="text-gray-300 hover:text-red-500 transition" title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="font-medium text-gray-900 mt-3">{s.nombre}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Users size={14} /> Capacidad para {s.capacidad}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
