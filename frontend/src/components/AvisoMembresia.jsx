import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { fecha } from "../utils/formato";

// HU-13: el aviso de mora se ve en el panel del estudiante, no solo cuando
// intenta reservar (HU-13-CA-03). Si está al día y le quedan pocos días,
// se le recuerda con tiempo. Si está al día y sin afán, no muestra nada.
const DIAS_PARA_RECORDAR = 5;

export default function AvisoMembresia({ membresia, conEnlace = true }) {
  if (!membresia) return null;

  if (membresia.estado === "AL_DIA") {
    if (membresia.diasRestantes > DIAS_PARA_RECORDAR) return null;
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        <Clock size={18} className="mt-0.5 shrink-0" />
        <p>
          Tu membresía vence el <strong>{fecha(membresia.vigenteHasta)}</strong> (
          {membresia.diasRestantes === 1 ? "queda 1 día" : `quedan ${membresia.diasRestantes} días`}). Renuévala en la
          academia para seguir reservando.
        </p>
      </div>
    );
  }

  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">
          {membresia.estado === "VENCIDA"
            ? `Tu membresía venció el ${fecha(membresia.vigenteHasta)}.`
            : "Todavía no tienes una membresía activa."}
        </p>
        <p className="mt-0.5">
          Mientras no se registre tu pago no podrás reservar clases. Acércate a la academia para ponerte al día.
          {conEnlace && (
            <>
              {" "}
              <Link to="/estudiante/pagos" className="font-medium underline">
                Ver mis pagos
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
