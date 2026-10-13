// Envuelve fetch con lo que se repite en cada llamada a la API: la URL base,
// el token del usuario logueado y el manejo de errores en un solo formato.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Si la API rechaza el token (venció o la demo se reinició), la sesión guardada
// ya no sirve: se avisa al AuthProvider para que cierre sesión y lleve al login.
let alVencerSesion = () => {};

function cuandoVenzaLaSesion(funcion) {
  alVencerSesion = funcion;
}

class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function solicitar(ruta, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${ruta}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) alVencerSesion();
    throw new ApiError(data?.error || "Ocurrió un error inesperado.", res.status);
  }

  return data;
}

// El plan gratuito del hosting apaga la API tras 15 minutos sin uso. Con esta
// llamada, la API empieza a encender apenas se abre la página, mientras la
// persona lee o escribe su correo, y no hasta que pulsa "Ingresar".
function despertarServidor() {
  fetch(`${BASE_URL}/health`).catch(() => {});
}

const api = {
  get: (ruta, token) => solicitar(ruta, { token }),
  post: (ruta, body, token) => solicitar(ruta, { method: "POST", body, token }),
  put: (ruta, body, token) => solicitar(ruta, { method: "PUT", body, token }),
  patch: (ruta, body, token) => solicitar(ruta, { method: "PATCH", body, token }),
  delete: (ruta, token) => solicitar(ruta, { method: "DELETE", token }),
};

export { api, ApiError, cuandoVenzaLaSesion, despertarServidor };
