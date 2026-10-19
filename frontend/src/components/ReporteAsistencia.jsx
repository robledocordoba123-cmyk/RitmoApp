import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, CardBody } from "./ui/Card";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";

// Por debajo de este porcentaje el estudiante se marca para que la academia
// lo note (por ejemplo, para llamarlo).
const ALERTA = 70;

function Porcentaje({ valor }) {
  if (valor === null) return <span className="text-gray-400">—</span>;
  return <Badge color={valor < ALERTA ? "red" : "green"}>{valor}%</Badge>;
}

const fechaHora = (f) => new Date(f).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

// OE-4 del acta · RF-20: reporte de asistencia del administrador dentro de
// Reportes (UI-18). Se consulta con el mismo rango de fechas que los otros
// reportes; muestra el resumen y la asistencia por estudiante o por clase.
export default function ReporteAsistencia({ rango }) {
  const { token } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("estudiantes");

  useEffect(() => {
    if (!rango) return;
    let vigente = true;
    api
      .get(`/reportes/asistencia?desde=${rango.desde}&hasta=${rango.hasta}`, token)
      .then((d) => vigente && (setDatos(d), setError("")))
      .catch((err) => vigente && setError(err.message));
    return () => {
      vigente = false;
    };
  }, [rango, token]);

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader title="Asistencia" />
        <CardBody>
          <p className="text-sm text-red-600">{error}</p>
        </CardBody>
      </Card>
    );
  }
  if (!datos) return null;

  const { resumen } = datos;
  const pestana = (clave, texto) => (
    <button
      type="button"
      onClick={() => setVista(clave)}
      aria-pressed={vista === clave}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        vista === clave ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <Card className="mt-6">
      <CardHeader title="Asistencia" subtitle={`${datos.desde} — ${datos.hasta} · clases que ya empezaron`} />
      <CardBody>
        {resumen.clases === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Sin clases en ese rango" description="No hubo clases dictadas entre esas fechas." />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2 mb-5">
              <div>
                <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{resumen.porcentajeAsistencia === null ? "—" : `${resumen.porcentajeAsistencia}%`}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">asistencia de lo registrado</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {resumen.clases} clases · {resumen.asistio} asistencias · {resumen.inasistencia} faltas · {resumen.excusa} excusas
              </p>
              {resumen.sinRegistrar > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {resumen.sinRegistrar} sin registrar ({resumen.clasesSinRegistrar} {resumen.clasesSinRegistrar === 1 ? "clase sin tomar asistencia" : "clases sin tomar asistencia"})
                </p>
              )}
            </div>

            <div className="flex gap-1 mb-3" role="group" aria-label="Ver asistencia">
              {pestana("estudiantes", "Por estudiante")}
              {pestana("clases", "Por clase")}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    {vista === "estudiantes" ? (
                      <>
                        <th className="py-2 font-medium">Estudiante</th>
                        <th className="py-2 font-medium">Clases</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 font-medium">Clase</th>
                        <th className="py-2 font-medium">Inscritos</th>
                      </>
                    )}
                    <th className="py-2 font-medium">Asistió</th>
                    <th className="py-2 font-medium">Faltó</th>
                    <th className="py-2 font-medium">Excusa</th>
                    <th className="py-2 font-medium">Sin registrar</th>
                    <th className="py-2 font-medium text-right">Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {(vista === "estudiantes" ? datos.porEstudiante : datos.porClase).map((f) => (
                    <tr key={f.estudianteId || f.claseId} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                      {vista === "estudiantes" ? (
                        <>
                          <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{f.nombre}</td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{f.clases}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{f.ritmo}</span>{" "}
                            <span className="text-gray-400">· {f.salon} · {f.profesor}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{fechaHora(f.fechaHoraInicio)}</div>
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400">{f.inscritos}</td>
                        </>
                      )}
                      <td className="py-2 text-gray-600 dark:text-gray-400">{f.asistio}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{f.inasistencia}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{f.excusa}</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">{f.sinRegistrar}</td>
                      <td className="py-2 text-right">
                        <Porcentaje valor={f.porcentajeAsistencia} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              El porcentaje solo cuenta lo que el profesor ya registró. En rojo, menos de {ALERTA}%.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
