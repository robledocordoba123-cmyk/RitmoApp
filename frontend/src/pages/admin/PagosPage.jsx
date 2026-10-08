import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { BadgeCheck, CircleAlert, Receipt, UserX, Wallet } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { pesos, fecha, MEDIOS_DE_PAGO, ESTADOS_MEMBRESIA } from "../../utils/formato";

const CAMPO =
  "rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
const VACIO = { estudianteId: "", tarifaId: "", medio: "EFECTIVO", monto: "", referencia: "" };

// RF-19 · HU-19: el admin registra los pagos que recibe en la academia y ve
// quién está al día (RN-05). No hay pasarela en línea (fuera de alcance).
export default function PagosPage() {
  const { token } = useAuth();
  const [estudiantes, setEstudiantes] = useState(null);
  const [tarifas, setTarifas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [filtro, setFiltro] = useState("TODOS");
  const [enviando, setEnviando] = useState(false);

  async function cargar() {
    const [m, t, p] = await Promise.all([
      api.get("/pagos/membresias", token),
      api.get("/tarifas", token),
      api.get("/pagos", token),
    ]);
    setEstudiantes(m);
    setTarifas(t.filter((tarifa) => tarifa.activa));
    setPagos(p);
  }

  useEffect(() => {
    cargar();
  }, []);

  const conteo = useMemo(() => {
    const c = { AL_DIA: 0, VENCIDA: 0, SIN_PAGOS: 0 };
    for (const e of estudiantes || []) c[e.membresia.estado] += 1;
    return c;
  }, [estudiantes]);

  function cambiar(campo) {
    return (e) => {
      const valor = e.target.value;
      setForm((prev) => {
        const siguiente = { ...prev, [campo]: valor };
        // Al elegir la tarifa se propone su valor; el admin lo puede cambiar.
        if (campo === "tarifaId") {
          const tarifa = tarifas.find((t) => t.id === valor);
          siguiente.monto = tarifa ? String(tarifa.valor) : "";
        }
        return siguiente;
      });
    };
  }

  // Desde la lista, "Registrar pago" deja al estudiante elegido en el formulario.
  function prepararPago(estudianteId) {
    setForm((prev) => ({ ...prev, estudianteId }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function registrar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const { pago, membresia } = await api.post(
        "/pagos",
        {
          estudianteId: form.estudianteId,
          tarifaId: form.tarifaId,
          medio: form.medio,
          monto: Number(form.monto),
          referencia: form.referencia || undefined,
        },
        token
      );
      toast.success(`Pago de ${pesos(pago.monto)} registrado. Membresía vigente hasta el ${fecha(membresia.vigenteHasta)}.`);
      setForm(VACIO);
      await cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (estudiantes === null) {
    return (
      <div>
        <PageHeader title="Pagos" subtitle="Registra los pagos de tus estudiantes y revisa quién está al día." />
        <SkeletonList />
      </div>
    );
  }

  const visibles = filtro === "TODOS" ? estudiantes : estudiantes.filter((e) => e.membresia.estado === filtro);

  return (
    <div>
      <PageHeader title="Pagos" subtitle="Registra los pagos de tus estudiantes y revisa quién está al día." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={BadgeCheck} label="Al día" value={conteo.AL_DIA} tone="green" />
        <StatCard icon={CircleAlert} label="Membresía vencida" value={conteo.VENCIDA} tone="rose" hint="no pueden reservar clases" />
        <StatCard icon={UserX} label="Sin pagos" value={conteo.SIN_PAGOS} tone="amber" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Registrar pago" />
        <CardBody>
          {tarifas.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Primero crea al menos una tarifa en{" "}
              <Link to="/admin/tarifas" className="font-medium text-indigo-600 hover:text-indigo-800">
                Tarifas
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={registrar} className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1 col-span-2">
                Estudiante
                <select required value={form.estudianteId} onChange={cambiar("estudianteId")} className={CAMPO}>
                  <option value="">Elige un estudiante</option>
                  {estudiantes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Tarifa
                <select required value={form.tarifaId} onChange={cambiar("tarifaId")} className={CAMPO}>
                  <option value="">Elige</option>
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Valor
                <input type="number" min="1" required value={form.monto} onChange={cambiar("monto")} className={CAMPO} />
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Medio
                <select value={form.medio} onChange={cambiar("medio")} className={CAMPO}>
                  {Object.entries(MEDIOS_DE_PAGO).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex flex-col gap-1">
                Referencia
                <input placeholder="Opcional" maxLength={60} value={form.referencia} onChange={cambiar("referencia")} className={CAMPO} />
              </label>
              <Button type="submit" icon={Wallet} disabled={enviando} className="col-span-2 lg:col-span-6 lg:justify-self-end">
                {enviando ? "Registrando..." : "Registrar pago"}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Estado de las membresías"
          action={
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={CAMPO} aria-label="Filtrar por estado">
              <option value="TODOS">Todos</option>
              <option value="AL_DIA">Al día</option>
              <option value="VENCIDA">Vencida</option>
              <option value="SIN_PAGOS">Sin pagos</option>
            </select>
          }
        />
        <CardBody>
          {visibles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay estudiantes en este estado.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibles.map((e) => {
                const estado = ESTADOS_MEMBRESIA[e.membresia.estado];
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{e.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {e.membresia.vigenteHasta
                          ? `${e.membresia.estado === "AL_DIA" ? "Vence" : "Venció"} el ${fecha(e.membresia.vigenteHasta)}`
                          : "Nunca ha pagado"}
                      </p>
                    </div>
                    <Badge color={estado.color}>{estado.texto}</Badge>
                    <button type="button" onClick={() => prepararPago(e.id)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      Registrar pago
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Últimos pagos registrados" />
        <CardBody>
          {pagos.length === 0 ? (
            <EmptyState icon={Receipt} title="Todavía no hay pagos" description="Los pagos que registres aparecerán aquí." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Estudiante</th>
                    <th className="py-2 font-medium">Plan</th>
                    <th className="py-2 font-medium">Medio</th>
                    <th className="py-2 font-medium">Registró</th>
                    <th className="py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.slice(0, 20).map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      <td className="py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fecha(p.registradoEn)}</td>
                      <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{p.estudiante.nombre}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{p.nombreTarifa}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">
                        {MEDIOS_DE_PAGO[p.medio]}
                        {p.referencia && <span className="text-gray-400"> · {p.referencia}</span>}
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{p.registradoPor.nombre}</td>
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
