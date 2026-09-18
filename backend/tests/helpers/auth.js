const request = require("supertest");
const app = require("../../src/app");
const { PASSWORD_PLANA } = require("./fixtures");

async function login(email, password = PASSWORD_PLANA) {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.token;
}

module.exports = { login };
