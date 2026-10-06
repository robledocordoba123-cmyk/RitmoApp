import { createContext, useContext, useEffect, useState } from "react";
import { api, cuandoVenzaLaSesion } from "../api/client";

const AuthContext = createContext(null);

// Se persiste en localStorage solo para que un refresh de página no cierre
// la sesión; no es información sensible nueva, es la misma que ya viaja en
// el JWT.
function leerSesionGuardada() {
  try {
    const guardado = localStorage.getItem("ritmoapp_sesion");
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);

  useEffect(() => {
    if (sesion) {
      localStorage.setItem("ritmoapp_sesion", JSON.stringify(sesion));
    } else {
      localStorage.removeItem("ritmoapp_sesion");
    }
  }, [sesion]);

  // Un token vencido cierra la sesión en vez de dejar la pantalla cargando.
  useEffect(() => {
    cuandoVenzaLaSesion(() => setSesion(null));
  }, []);

  async function login(email, password) {
    const data = await api.post("/auth/login", { email, password });
    setSesion({ token: data.token, usuario: data.usuario });
    return data.usuario;
  }

  async function onboarding(academia, admin) {
    const data = await api.post("/auth/onboarding", { academia, admin });
    setSesion({ token: data.token, usuario: data.usuario });
    return data;
  }

  function logout() {
    setSesion(null);
  }

  const value = {
    token: sesion?.token || null,
    usuario: sesion?.usuario || null,
    estaAutenticado: Boolean(sesion?.token),
    login,
    onboarding,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return ctx;
}
