import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

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
  const [error, setError] = useState("");

  async function consultar(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api.get(`/reportes/ocupacion?desde=${desde}&hasta=${hasta}`, token);
      setReporte(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Reporte de ocupación por salón</h1>

      <form onSubmit={consultar} className="flex flex-wrap items-end gap-2 mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs text-gray-600 flex flex-col gap-1">
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          Consultar
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {reporte && (
        reporte.salones.length === 0 ? (
          <p className="text-sm text-gray-500">No hubo clases programadas en ese rango.</p>
        ) : (
          <div className="space-y-3">
            {reporte.salones.map((s) => (
              <div key={s.salonId} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{s.salon}</p>
                  <p className="text-sm text-gray-500">{s.porcentajeOcupacion}%</p>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{ width: `${Math.min(s.porcentajeOcupacion, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {s.reservasConfirmadas} reservas de {s.capacidadOfertada} cupos ofertados en {s.totalClases} clases
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
