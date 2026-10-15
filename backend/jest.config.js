module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/env.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 15000,
  // Los tests comparten una sola base de datos de prueba y cada uno la limpia
  // al empezar: correrlos en paralelo haría que se pisaran entre sí.
  maxWorkers: 1,

  // AM-03 (DOC-07): con `npm run test:coverage` la suite falla si la
  // cobertura baja de estos mínimos, así no se pierde sin que nadie lo note.
  collectCoverageFrom: ["src/**/*.js"],
  coverageReporters: ["text-summary", "json-summary", "lcov"],
  coverageThreshold: {
    global: { lines: 80, branches: 70 },
  },
};
