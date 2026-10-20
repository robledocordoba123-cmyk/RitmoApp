const { enviarCorreo, esCorreoDePrueba } = require("../src/utils/correo");

// Los usuarios de la demo tienen correos @*.test, que no existen. Enviarles
// gasta la cuota de Brevo (300 al día en el plan gratuito) y produce rebotes.

describe("Correos a dominios de prueba", () => {
  const claveOriginal = process.env.BREVO_API_KEY;
  let fetchFalso;

  beforeEach(() => {
    process.env.BREVO_API_KEY = "clave-de-prueba";
    fetchFalso = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, text: async () => "" });
  });

  afterEach(() => {
    fetchFalso.mockRestore();
    if (claveOriginal === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = claveOriginal;
  });

  test("CP-181 · a un correo @*.test no se envía nada; a uno real sí", async () => {
    await enviarCorreo({ para: "laura@ritmocentral.test", asunto: "Mañana tienes clase", texto: "Hola", html: "<p>Hola</p>" });
    expect(fetchFalso).not.toHaveBeenCalled();

    await enviarCorreo({ para: "laura@gmail.com", asunto: "Mañana tienes clase", texto: "Hola", html: "<p>Hola</p>" });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body).to).toEqual([{ email: "laura@gmail.com" }]);
  });

  test("CP-182 · reconoce los dominios reservados sin confundir dominios reales", () => {
    expect(["a@x.test", "a@x.example", "a@x.invalid", "a@x.localhost", "A@X.TEST "].every(esCorreoDePrueba)).toBe(true);
    expect(["a@gmail.com", "a@testing.co", "a@test.com.co", "a@academia.edu.co"].some(esCorreoDePrueba)).toBe(false);
  });
});
