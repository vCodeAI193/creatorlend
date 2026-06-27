import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// Muss zum Hash in AuthService passen (MVP: SHA-256; später argon2/bcrypt).
const hash = (pw: string) => createHash("sha256").update(pw).digest("hex");

async function main() {
  const artist = await prisma.user.upsert({
    where: { email: "artist@creatorlend.dev" },
    update: {},
    create: {
      email: "artist@creatorlend.dev",
      passwordHash: hash("password123"),
      displayName: "Lo-Fi Luna",
      role: "ARTIST",
    },
  });

  await prisma.user.upsert({
    where: { email: "listener@creatorlend.dev" },
    update: {},
    create: {
      email: "listener@creatorlend.dev",
      passwordHash: hash("password123"),
      displayName: "Hörer Max",
      role: "LISTENER",
    },
  });

  const works = [
    { title: "Midnight Tape", type: "MUSIC", loanPriceCents: 150, durationSeconds: 1820 },
    { title: "Sleepless Stories", type: "AUDIOBOOK", loanPriceCents: 300, durationSeconds: 7200 },
    { title: "Comedy Corner #1", type: "SKETCH", loanPriceCents: 100, durationSeconds: 600 },
  ] as const;

  for (const w of works) {
    const existing = await prisma.work.findFirst({
      where: { artistId: artist.id, title: w.title },
    });
    if (!existing) {
      await prisma.work.create({
        data: {
          artistId: artist.id,
          title: w.title,
          type: w.type,
          loanPriceCents: w.loanPriceCents,
          durationSeconds: w.durationSeconds,
          language: "de",
          status: "PUBLISHED",
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed abgeschlossen: 1 Artist, 1 Listener, 3 veröffentlichte Werke.");
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
