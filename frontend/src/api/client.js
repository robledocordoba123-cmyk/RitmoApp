// Envuelve fetch con lo que se repite en cada llamada a la API: la URL base,
// el token del usuario logueado y el manejo de errores en un solo formato.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
    throw new ApiError(data?.error || "Ocurrió un error inesperado.", res.status);
  }

  return data;
}

const api = {
  get: (ruta, token) => solicitar(ruta, { token }),
  post: (ruta, body, token) => solicitar(ruta, { method: "POST", body, token }),
  put: (ruta, body, token) => solicitar(ruta, { method: "PUT", body, token }),
  patch: (ruta, body, token) => solicitar(ruta, { method: "PATCH", body, token }),
  delete: (ruta, token) => solicitar(ruta, { method: "DELETE", token }),
};

export { api, ApiError };
