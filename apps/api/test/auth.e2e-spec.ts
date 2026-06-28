import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * e2e-Test der Auth-Härtung (B-001..B-004, B-009):
 * Registrierung + E-Mail-Verifizierung, Login, Refresh-Rotation inkl.
 * Reuse-Erkennung, Passwort-Reset mit Session-Invalidierung.
 */
describe("Auth-Härtung (e2e)", () => {
  let app: INestApplication;
  const uniq = `${Date.now()}`;
  const email = `auth+${uniq}@test.dev`;
  const resetEmail = `reset+${uniq}@test.dev`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it("registriert und liefert Access- + Refresh-Token", async () => {
    const res = await api()
      .post("/api/v1/auth/register")
      .send({ email, password: "password123", displayName: "Auth User", role: "LISTENER" })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.devEmailVerifyToken).toBeDefined();
  });

  it("verifiziert die E-Mail per Token (B-002)", async () => {
    const reg = await api()
      .post("/api/v1/auth/register")
      .send({ email: `v+${uniq}@test.dev`, password: "password123", displayName: "V" })
      .expect(201);
    const res = await api()
      .post("/api/v1/auth/verify-email")
      .send({ token: reg.body.devEmailVerifyToken })
      .expect(200);
    expect(res.body.verified).toBe(true);

    // Token ist verbraucht -> zweite Verwendung scheitert.
    await api()
      .post("/api/v1/auth/verify-email")
      .send({ token: reg.body.devEmailVerifyToken })
      .expect(401);
  });

  it("login: korrekt -> Tokens, falsch -> 401", async () => {
    const ok = await api()
      .post("/api/v1/auth/login")
      .send({ email, password: "password123" })
      .expect(200);
    expect(ok.body.refreshToken).toBeDefined();

    await api()
      .post("/api/v1/auth/login")
      .send({ email, password: "wrong-pw" })
      .expect(401);
  });

  it("rotiert Refresh-Tokens und erkennt Reuse (B-001)", async () => {
    const reg = await api()
      .post("/api/v1/auth/register")
      .send({ email: `rot+${uniq}@test.dev`, password: "password123", displayName: "Rot" })
      .expect(201);
    const r0 = reg.body.refreshToken;

    const a = await api().post("/api/v1/auth/refresh").send({ refreshToken: r0 }).expect(200);
    const r1 = a.body.refreshToken;
    expect(r1).not.toBe(r0);

    const b = await api().post("/api/v1/auth/refresh").send({ refreshToken: r1 }).expect(200);
    const r2 = b.body.refreshToken;

    // r1 erneut benutzen -> Reuse erkannt -> Familie widerrufen.
    await api().post("/api/v1/auth/refresh").send({ refreshToken: r1 }).expect(401);
    // r2 gehört zur selben Familie und ist nun ebenfalls ungültig.
    await api().post("/api/v1/auth/refresh").send({ refreshToken: r2 }).expect(401);
  });

  it("setzt das Passwort zurück und invalidiert bestehende Sessions (B-003)", async () => {
    const reg = await api()
      .post("/api/v1/auth/register")
      .send({ email: resetEmail, password: "oldpassword1", displayName: "Reset" })
      .expect(201);
    const oldRefresh = reg.body.refreshToken;

    const forgot = await api()
      .post("/api/v1/auth/forgot-password")
      .send({ email: resetEmail })
      .expect(202);
    expect(forgot.body.devResetToken).toBeDefined();

    await api()
      .post("/api/v1/auth/reset-password")
      .send({ token: forgot.body.devResetToken, newPassword: "newpassword1" })
      .expect(200);

    // Neues Passwort funktioniert, altes nicht mehr.
    await api().post("/api/v1/auth/login").send({ email: resetEmail, password: "newpassword1" }).expect(200);
    await api().post("/api/v1/auth/login").send({ email: resetEmail, password: "oldpassword1" }).expect(401);

    // Vor dem Reset ausgegebenes Refresh-Token ist widerrufen.
    await api().post("/api/v1/auth/refresh").send({ refreshToken: oldRefresh }).expect(401);
  });

  it("verlangt Bearer-Token auf geschützten Routen weiterhin", async () => {
    await api().get("/api/v1/users/me").expect(401);
  });
});
