import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

function preferenciaGuardada() {
  try {
    return localStorage.getItem("ritmoapp_tema");
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => preferenciaGuardada() || "claro");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "oscuro");
    try {
      localStorage.setItem("ritmoapp_tema", tema);
    } catch {
      // localStorage puede fallar en modo privado; no es crítico para el tema en esta sesión.
    }
  }, [tema]);

  function alternar() {
    setTema((t) => (t === "oscuro" ? "claro" : "oscuro"));
  }

  return <ThemeContext.Provider value={{ tema, alternar }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider.");
  return ctx;
}
