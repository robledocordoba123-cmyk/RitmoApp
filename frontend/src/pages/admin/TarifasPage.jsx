import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Tags, Trash2, Power, Pencil } from "lucide-react";
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
// Editar una tarifa no cambia los pagos ya registrados (HU-18-CA-03): cada
// pago guarda su propia copia del nombre, el valor y la duración.
// Pantalla UI-16 de DOC-05 (HU-18).
export default function TarifasPage() {
  const { token } = useAuth();
  const [tarifas, setTarifas] = useState(null);
  const [form, setForm] = useState({ nombre: "", valor: "", duracionDias: "30" });
  const [enviando, setEnviando] = useState(false);
  // Tarifa que se está editando: { id, nombre, valor, duracionDias } o null.
  const [edicion, setEdicion] = useState(null);

  async function cargar() {
    setTarifas(await api.get("/tarifas", token));
  }

  useEffect(() => {
    cargar().catch((err) => toast.error(err.message));
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

  function empezarEdicion(tarifa) {
    setEdicion({ id: tarifa.id, nombre: tarifa.nombre, valor: String(tarifa.valor), duracionDias: String(tarifa.duracionDias) });
  }

  function cambiarEdicion(campo) {
    return (e) => setEdicion((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      await api.put(
        `/tarifas/${edicion.id}`,
        { nombre: edicion.nombre, valor: Number(edicion.valor), duracionDias: Number(edicion.duracionDias) },
        token
      );
      setEdicion(null);
      toast.success("Tarifa actualizada. Los pagos ya registrados conservan su valor.");
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
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
          {tarifas.map((t) =>
            edicion?.id === t.id ? (
              <Card key={t.id}>
                <CardBody className="pt-5">
                  <form onSubmit={guardarEdicion} aria-label={`Editar ${t.nombre}`} className="space-y-3">
                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                      Nombre
                      <input required value={edicion.nombre} onChange={cambiarEdicion("nombre")} className={`${CAMPO} mt-1 w-full`} />
                    </label>
                    <div className="flex gap-3">
                      <label className="block flex-1 text-sm text-gray-600 dark:text-gray-400">
                        Valor en pesos
                        <input type="number" min="1" required value={edicion.valor} onChange={cambiarEdicion("valor")} className={`${CAMPO} mt-1 w-full`} />
                      </label>
                      <label className="block w-24 text-sm text-gray-600 dark:text-gray-400">
                        Días
                        <input type="number" min="1" max="366" required value={edicion.duracionDias} onChange={cambiarEdicion("duracionDias")} className={`${CAMPO} mt-1 w-full`} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Los pagos ya registrados conservan el valor con el que se pagaron.</p>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={enviando}>Guardar</Button>
                      <Button type="button" variant="secondary" onClick={() => setEdicion(null)}>Cancelar</Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : (
              <Card hover key={t.id}>
                <CardBody className={`pt-5 ${t.activa ? "" : "opacity-60"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                      <Tags size={18} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => empezarEdicion(t)} className="text-gray-300 hover:text-indigo-600 transition" title="Editar" aria-label={`Editar ${t.nombre}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => alternar(t)} className="text-gray-300 hover:text-indigo-600 transition" title={t.activa ? "Desactivar" : "Activar"} aria-label={`${t.activa ? "Desactivar" : "Activar"} ${t.nombre}`}>
                        <Power size={16} />
                      </button>
                      <button onClick={() => eliminar(t.id)} className="text-gray-300 hover:text-red-500 transition" title="Eliminar" aria-label={`Eliminar ${t.nombre}`}>
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
            )
          )}
        </div>
      )}
    </div>
  );
}
