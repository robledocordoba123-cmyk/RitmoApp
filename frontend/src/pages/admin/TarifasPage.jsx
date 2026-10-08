import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Tags, Trash2, Power } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { pesos } from "../../utils/formato";

const CAMPO =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

// RF-18 · HU-18: los planes que vende la academia. Una tarifa con pagos no se
// borra (RN-13): se desactiva para que no se use en pagos nuevos.
export default function TarifasPage() {
  const { token } = useAuth();
  const [tarifas, setTarifas] = useState(null);
  const [form, setForm] = useState({ nombre: "", valor: "", duracionDias: "30" });
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    setTarifas(await api.get("/tarifas", token));
  }

  useEffect(() => {
    cargar();
  }, []);

  function cambiar(campo) {
    return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function crear(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.post("/tarifas", { nombre: form.nombre, valor: Number(form.valor), duracionDias: Number(form.duracionDias) }, token);
      setForm({ nombre: "", valor: "", duracionDias: "30" });
      toast.success("Tarifa agregada.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function alternar(tarifa) {
    try {
      await api.put(`/tarifas/${tarifa.id}`, { activa: !tarifa.activa }, token);
      toast.success(tarifa.activa ? "Tarifa desactivada." : "Tarifa activada.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/tarifas/${id}`, token);
      toast.success("Tarifa eliminada.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Tarifas" subtitle="Los planes que vende tu academia. Cada pago que registres usa una de estas tarifas." />

      <Card className="mb-6">
        <CardHeader title="Agregar tarifa" />
        <CardBody>
          <form onSubmit={crear} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input placeholder="Nombre (ej. Mensualidad)" required value={form.nombre} onChange={cambiar("nombre")} className={`${CAMPO} col-span-2 sm:col-span-1`} />
            <input type="number" min="1" placeholder="Valor en pesos" required value={form.valor} onChange={cambiar("valor")} className={CAMPO} />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="number" min="1" max="366" required value={form.duracionDias} onChange={cambiar("duracionDias")} className={`${CAMPO} w-20`} />
              días
            </label>
            <Button type="submit" icon={Plus} disabled={enviando} className="col-span-2 sm:col-span-1">
              Agregar
            </Button>
          </form>
        </CardBody>
      </Card>

      {tarifas === null ? (
        <SkeletonList />
      ) : tarifas.length === 0 ? (
        <EmptyState icon={Tags} title="Todavía no tienes tarifas" description="Crea al menos una para poder registrar pagos." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tarifas.map((t) => (
            <Card hover key={t.id}>
              <CardBody className={`pt-5 ${t.activa ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                    <Tags size={18} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => alternar(t)} className="text-gray-300 hover:text-indigo-600 transition" title={t.activa ? "Desactivar" : "Activar"}>
                      <Power size={16} />
                    </button>
                    <button onClick={() => eliminar(t.id)} className="text-gray-300 hover:text-red-500 transition" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t.nombre}</p>
                  {!t.activa && <Badge>Inactiva</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 dark:text-gray-400">
                  {pesos(t.valor)} · {t.duracionDias === 1 ? "1 día" : `${t.duracionDias} días`}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
