# RitmoApp — Frontend

React 19 + Vite + Tailwind CSS 4. Un panel por rol (SuperAdmin, Admin de academia, Profesor, Estudiante), modo oscuro y calendario semanal de clases.

```bash
npm install
npm run dev     # http://localhost:5173 (las llamadas a /api van al backend en :4000 por el proxy de Vite)
npm run lint
npm run build
```

En producción, `VITE_API_URL` debe apuntar a la URL pública de la API (por ejemplo `https://ritmoapp-api.onrender.com/api`).

Instrucciones completas del proyecto en el [README principal](../README.md).
