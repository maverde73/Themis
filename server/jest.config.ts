import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  resolver: "<rootDir>/jest-resolver.cjs",
  transformIgnorePatterns: [
    "node_modules/(?!(@noble|@paralleldrive/cuid2)/)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    ".+\\.js$": "ts-jest",
  },
};

export default config;
