import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * End-to-End-Test des Kern-Loops gegen eine laufende Postgres-DB.
 * Voraussetzung: `docker compose up -d` + `prisma migrate deploy`.
 *
 * Ablauf: register → activate Abo → Werk einstellen/veröffentlichen →
 * leihen → verlängern → tauschen → Künstlervergütung prüfen.
 */
describe("Kern-Loop (e2e)", () => {
  let app: INestApplication;
  const uniq = `${Date.now()}`;
  const listenerEmail = `listener+${uniq}@test.dev`;
  const artistEmail = `artist+${uniq}@test.dev`;

  let listenerToken: string;
  let artistToken: string;
  let workId: string;
  let secondWorkId: string;
  let loanId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it("registriert Hörer:in und Künstler:in", async () => {
    const l = await api()
      .post("/api/v1/auth/register")
      .send({ email: listenerEmail, password: "password123", displayName: "L", role: "LISTENER" })
      .expect(201);
    listenerToken = l.body.accessToken;
    expect(listenerToken).toBeDefined();

    const a = await api()
      .post("/api/v1/auth/register")
      .send({ email: artistEmail, password: "password123", displayName: "A", role: "ARTIST" })
      .expect(201);
    artistToken = a.body.accessToken;
    expect(artistToken).toBeDefined();
  });

  it("aktiviert ein Abo (Dev) für die/den Hörer:in", async () => {
    const res = await api()
      .post("/api/v1/subscriptions/activate")
      .set("Authorization", `Bearer ${listenerToken}`)
      .send({ plan: "STANDARD" })
      .expect(201);
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.loanQuotaPerPeriod).toBeGreaterThan(0);
  });

  it("verhindert Werk-Einstellen für Nicht-Künstler:innen (Rollen-Guard)", async () => {
    await api()
      .post("/api/v1/works")
      .set("Authorization", `Bearer ${listenerToken}`)
      .send({ title: "X", type: "MUSIC", loanPriceCents: 100 })
      .expect(403);
  });

  it("Künstler:in stellt zwei Werke ein und veröffentlicht sie", async () => {
    const w1 = await api()
      .post("/api/v1/works")
      .set("Authorization", `Bearer ${artistToken}`)
      .send({ title: "Tape A", type: "MUSIC", loanPriceCents: 150 })
      .expect(201);
    workId = w1.body.id;
    expect(w1.body.upload.url).toContain("sig=");

    await api()
      .post(`/api/v1/works/${workId}/publish`)
      .set("Authorization", `Bearer ${artistToken}`)
      .expect(201);

    const w2 = await api()
      .post("/api/v1/works")
      .set("Authorization", `Bearer ${artistToken}`)
      .send({ title: "Tape B", type: "SKETCH", loanPriceCents: 200 })
      .expect(201);
    secondWorkId = w2.body.id;
    await api()
      .post(`/api/v1/works/${secondWorkId}/publish`)
      .set("Authorization", `Bearer ${artistToken}`)
      .expect(201);
  });

  it("Hörer:in leiht ein Werk und erhält eine Zugriffs-URL", async () => {
    const res = await api()
      .post("/api/v1/loans")
      .set("Authorization", `Bearer ${listenerToken}`)
      .send({ workId })
      .expect(201);
    loanId = res.body.id;
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.access.streamUrl).toContain("sig=");
    expect(new Date(res.body.access.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("verhindert doppeltes Leihen desselben Werks", async () => {
    await api()
      .post("/api/v1/loans")
      .set("Authorization", `Bearer ${listenerToken}`)
      .send({ workId })
      .expect(409);
  });

  it("verlängert die Leihe (renewalCount steigt)", async () => {
    const res = await api()
      .post(`/api/v1/loans/${loanId}/renew`)
      .set("Authorization", `Bearer ${listenerToken}`)
      .expect(201);
    expect(res.body.renewalCount).toBe(1);
  });

  it("tauscht gegen ein anderes Werk", async () => {
    const res = await api()
      .post(`/api/v1/loans/${loanId}/exchange`)
      .set("Authorization", `Bearer ${listenerToken}`)
      .send({ newWorkId: secondWorkId })
      .expect(201);
    expect(res.body.previousLoan.status).toBe("EXCHANGED");
    expect(res.body.newLoan.status).toBe("ACTIVE");
  });

  it("zeigt der/dem Künstler:in die aufgelaufene Vergütung", async () => {
    const res = await api()
      .get("/api/v1/payouts/summary")
      .set("Authorization", `Bearer ${artistToken}`)
      .expect(200);
    // 1x leihen (150) + 1x verlängern (150) + 1x tauschen auf Werk B (200) = 500
    expect(res.body.pendingCents).toBe(500);
    expect(res.body.lifetimeLoans).toBe(3);
  });
});
