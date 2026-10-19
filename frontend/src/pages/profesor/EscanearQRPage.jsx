import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import jsQR from "jsqr";
import { ArrowLeft, Camera, CameraOff, CheckCircle2, ScanLine } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

// Un mismo código leído varias veces seguidas (la cámara lo ve en cada cuadro)
// se envía una sola vez cada tantos milisegundos.
const ESPERA_MISMO_CODIGO = 4000;

// UI-26: el profesor escanea el QR de cada estudiante y queda en "Asistió".
// La cámara se lee con jsQR cuadro por cuadro; si el equipo no tiene cámara,
// el código se puede pegar a mano. Todas las reglas las valida la API.
export default function EscanearQRPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const video = useRef(null);
  const lienzo = useRef(null);
  const flujo = useRef(null);
  const ultimo = useRef({ codigo: "", hora: 0 });
  const [camara, setCamara] = useState("apagada"); // apagada | encendida | sin-permiso
  const [registrados, setRegistrados] = useState([]);
  const [manual, setManual] = useState("");
  const [inscritos, setInscritos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/clases/${id}/inscritos`, token).then(setInscritos).catch((err) => setError(err.message));
  }, [id, token]);

  const enviar = useCallback(
    async (codigo) => {
      const ahora = Date.now();
      if (codigo === ultimo.current.codigo && ahora - ultimo.current.hora < ESPERA_MISMO_CODIGO) return;
      ultimo.current = { codigo, hora: ahora };
      try {
        const r = await api.post(`/qr/clases/${id}/asistencia`, { codigo }, token);
        if (r.yaEstabaRegistrado) {
          toast(`${r.estudiante.nombre} ya estaba registrado.`);
        } else {
          toast.success(`${r.estudiante.nombre}: asistió.`);
        }
        setRegistrados((lista) => (lista.some((e) => e.id === r.estudiante.id) ? lista : [r.estudiante, ...lista]));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [id, token]
  );

  const apagar = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
    setCamara((c) => (c === "encendida" ? "apagada" : c));
  }, []);

  async function encender() {
    try {
      flujo.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.current.srcObject = flujo.current;
      await video.current.play();
      setCamara("encendida");
    } catch {
      setCamara("sin-permiso");
    }
  }

  // Mientras la cámara está encendida se lee un cuadro tras otro buscando un QR.
  useEffect(() => {
    if (camara !== "encendida") return;
    let cuadro;
    const leer = () => {
      const v = video.current;
      const c = lienzo.current;
      if (v && c && v.readyState === v.HAVE_ENOUGH_DATA) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(v, 0, 0, c.width, c.height);
        const qr = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
        if (qr?.data) enviar(qr.data);
      }
      cuadro = requestAnimationFrame(leer);
    };
    cuadro = requestAnimationFrame(leer);
    return () => cancelAnimationFrame(cuadro);
  }, [camara, enviar]);

  useEffect(() => apagar, [apagar]);

  function enviarManual(e) {
    e.preventDefault();
    if (!manual.trim()) return;
    ultimo.current = { codigo: "", hora: 0 };
    enviar(manual.trim());
    setManual("");
  }

  const volver = (
    <Link to="/profesor/clases" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 dark:text-gray-400">
      <ArrowLeft size={14} /> Volver a mis clases
    </Link>
  );

  if (error) {
    return (
      <div>
        {volver}
        <PageHeader title="Escanear QR" />
        <EmptyState icon={CameraOff} title="No se pudo abrir esta clase" description={error} />
      </div>
    );
  }

  const presentes = new Set([
    ...(inscritos || []).filter((i) => i.estadoAsistencia === "ASISTIO").map((i) => i.estudianteId),
    ...registrados.map((e) => e.id),
  ]).size;

  return (
    <div>
      {volver}
      <PageHeader
        title="Escanear QR"
        subtitle={inscritos ? `${presentes} de ${inscritos.length} inscritos con asistencia` : "Apunta la cámara al código de cada estudiante."}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardBody className="pt-5">
            <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-gray-900">
              <video ref={video} muted playsInline className={`h-full w-full object-cover ${camara === "encendida" ? "" : "hidden"}`} />
              {camara !== "encendida" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-gray-300">
                  <ScanLine size={40} />
                  <p className="text-sm">
                    {camara === "sin-permiso"
                      ? "No se pudo usar la cámara. Revisa el permiso del navegador o pega el código abajo."
                      : "Enciende la cámara y apunta al QR del estudiante."}
                  </p>
                </div>
              )}
              <canvas ref={lienzo} className="hidden" />
            </div>
            <div className="mt-4 flex justify-center">
              {camara === "encendida" ? (
                <Button variant="secondary" icon={CameraOff} onClick={apagar}>
                  Apagar cámara
                </Button>
              ) : (
                <Button icon={Camera} onClick={encender}>
                  Encender cámara
                </Button>
              )}
            </div>

            <form onSubmit={enviarManual} className="mt-5 flex gap-2">
              <label className="sr-only" htmlFor="codigo-manual">
                Código QR
              </label>
              <input
                id="codigo-manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="¿Sin cámara? Pega aquí el código"
                className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <Button type="submit" variant="secondary">
                Registrar
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Registrados con QR" />
          <CardBody>
            {registrados.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aún no has escaneado a nadie en esta sesión.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {registrados.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-2 text-sm text-gray-900 dark:text-gray-100">
                    <CheckCircle2 size={16} className="text-green-600" /> {e.nombre}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
