/** e2e-Tests (benötigen eine laufende Postgres-DB via DATABASE_URL). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test",
  testRegex: ".*\\.e2e-spec\\.ts$",
  moduleNameMapper: {
    "^@creatorlend/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
};
