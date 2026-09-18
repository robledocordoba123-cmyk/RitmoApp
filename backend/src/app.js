const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

// Manejador de errores centralizado: evita que un error sin capturar tumbe el proceso
// y sirve para no repetir try/catch de respuesta en cada controlador.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;
