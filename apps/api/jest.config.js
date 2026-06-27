/** Unit-Tests (kein DB-Zugriff, Prisma gemockt). */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  moduleNameMapper: {
    "^@creatorlend/shared$": "<rootDir>/../../../packages/shared/src/index.ts",
  },
};
