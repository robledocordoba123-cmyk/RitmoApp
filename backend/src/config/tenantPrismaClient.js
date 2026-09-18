const prisma = require("./prisma");

// Modelos cuyas filas pertenecen siempre a una sola academia. "users" queda
// fuera a propósito: el login necesita buscar por correo sin conocer todavía
// el tenant, y el SuperAdmin no tiene tenantId propio.
const MODELOS_CON_TENANT = new Set(["salon", "ritmo", "clase", "reserva", "asistencia"]);

const OPERACIONES_CON_WHERE = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/**
 * Devuelve un cliente de Prisma con el tenantId ya incorporado en cada
 * consulta de los modelos multi-tenant (RNF-01). El controlador nunca decide
 * si filtrar por tenant: el cliente lo hace siempre, así sea por accidente
 * que alguien olvide agregarlo a mano.
 */
function forTenant(tenantId) {
  if (!tenantId) {
    throw new Error("forTenant requiere un tenantId válido.");
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelo = model.toLowerCase();
          if (!MODELOS_CON_TENANT.has(modelo)) {
            return query(args);
          }

          if (operation === "create") {
            args.data = { ...args.data, tenantId };
          } else if (operation === "createMany") {
            args.data = Array.isArray(args.data)
              ? args.data.map((item) => ({ ...item, tenantId }))
              : args.data;
          } else if (operation === "upsert") {
            args.where = { ...args.where, tenantId };
            args.create = { ...args.create, tenantId };
          } else if (OPERACIONES_CON_WHERE.has(operation)) {
            args.where = { ...args.where, tenantId };
          }

          return query(args);
        },
      },
    },
  });
}

module.exports = { forTenant };
