import { useEffect, useId, useState } from "react";
import { Bot, Send, Info, XCircle } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";

const SUGERENCIAS = [
  "¿Qué salón estuvo más vacío este mes?",
  "¿A quién se le vence la membresía esta semana?",
  "¿Cuánto se recaudó este mes y por qué medio?",
  "¿Quiénes son los estudiantes que más faltan?",
  "¿Qué clases de los próximos días tienen cupos libres?",
];

// UI-28 · RF-23 · HU-24: asistente de IA del administrador. Responde preguntas
// sobre la academia consultando los mismos reportes de RitmoApp; no puede
// cambiar nada. La respuesta se muestra como texto plano (React escapa todo).
export default function AsistentePage() {
  const { token } = useAuth();
  const idPregunta = useId();
  const [disponible, setDisponible] = useState(null);
  const [pregunta, setPregunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/asistente/estado", token)
      .then((r) => setDisponible(r.disponible))
      .catch(() => setDisponible(false));
  }, [token]);

  async function enviar(texto) {
    const limpia = texto.trim();
    if (limpia.length < 3 || enviando) return;
    setEnviando(true);
    setError("");
    setResultado(null);
    try {
      setResultado({ pregunta: limpia, ...(await api.post("/asistente", { pregunta: limpia }, token)) });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const encabezado = <PageHeader title="Asistente" subtitle="Pregúntale a RitmoApp por tu academia en tus propias palabras." />;

  if (disponible === null) {
    return (
      <div>
        {encabezado}
        <SkeletonList filas={2} />
      </div>
    );
  }

  if (!disponible) {
    return (
      <div>
        {encabezado}
        <EmptyState icon={Bot} title="El asistente no está activo" description="Esta instalación de RitmoApp no tiene configurado el asistente de IA. Puedes ver la misma información en Reportes." />
      </div>
    );
  }

  return (
    <div>
      {encabezado}

      <Card className="mb-5">
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(pregunta);
            }}
          >
            <label htmlFor={idPregunta} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
              Tu pregunta
            </label>
            <textarea
              id={idPregunta}
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Por ejemplo: ¿qué salón estuvo más lleno la semana pasada?"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div className="flex flex-wrap gap-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPregunta(s);
                      enviar(s);
                    }}
                    disabled={enviando}
                    className="text-xs rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button type="submit" icon={Send} disabled={enviando || pregunta.trim().length < 3}>
                {enviando ? "Consultando…" : "Preguntar"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {enviando && <SkeletonList filas={2} />}

      {error && <EmptyState icon={XCircle} title="No se pudo responder" description={error} />}

      {resultado && (
        <Card>
          <CardHeader title={resultado.pregunta} />
          <CardBody>
            <p className="whitespace-pre-line text-sm text-gray-800 dark:text-gray-100 leading-relaxed">{resultado.respuesta}</p>
            {resultado.consultas?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs text-gray-500">Consultó:</span>
                {resultado.consultas.map((c) => (
                  <Badge key={c} color="indigo">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <p className="flex items-start gap-2 text-xs text-gray-500 mt-5">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Las respuestas las genera una IA a partir de los reportes de tu academia. Revisa las cifras importantes en Reportes antes de tomar decisiones. El asistente solo consulta: no puede crear, cambiar ni borrar nada.
      </p>
    </div>
  );
}
