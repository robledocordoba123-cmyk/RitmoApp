module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/env.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  testTimeout: 15000,
  // Los tests comparten una sola base de datos de prueba y cada uno la limpia
  // al empezar: correrlos en paralelo haría que se pisaran entre sí.
  maxWorkers: 1,
};
