import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { despertarServidor } from './api/client.js'

// La API gratuita de Render se apaga tras 15 minutos sin uso; se empieza a
// despertar apenas carga la página, mientras la persona lee o escribe.
despertarServidor()

// Orden de los proveedores: el router primero (las pantallas navegan), luego
// el tema (modo oscuro) y la sesión. Toaster muestra los avisos breves de
// éxito o error en la esquina superior derecha.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{ style: { fontSize: '14px' }, className: 'dark:!bg-gray-800 dark:!text-gray-100' }}
          />
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
