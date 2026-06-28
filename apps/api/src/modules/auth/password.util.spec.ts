import { hashPassword, verifyPassword } from "./password.util";

describe("password.util (B-004 scrypt)", () => {
  it("erzeugt einen scrypt-Hash und verifiziert das korrekte Passwort", () => {
    const hash = hashPassword("correct horse battery");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", hash)).toBe(true);
  });

  it("lehnt ein falsches Passwort ab", () => {
    const hash = hashPassword("s3cret-pw");
    expect(verifyPassword("wrong-pw", hash)).toBe(false);
  });

  it("nutzt pro Hash ein eigenes Salt (unterschiedliche Hashes)", () => {
    expect(hashPassword("same-pw")).not.toBe(hashPassword("same-pw"));
  });

  it("verträgt fehlerhaft formatierte Hashes ohne Crash", () => {
    expect(verifyPassword("x", "not-a-valid-hash")).toBe(false);
  });
});
