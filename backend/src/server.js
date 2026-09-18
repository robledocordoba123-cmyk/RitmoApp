require("dotenv").config({ quiet: true });
const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`RitmoApp API escuchando en http://localhost:${PORT}`);
});
