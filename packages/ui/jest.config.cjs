const path = require("node:path");

module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  rootDir: path.join(__dirname, "..", ".."),
  roots: ["<rootDir>/packages"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: path.join(__dirname, "tsconfig.jest.json"),
      },
    ],
  },
  testMatch: [
    "**/__tests__/**/*.(spec|test).(ts|tsx|js)",
    "**/?(*.)+(spec|test).(ts|tsx|js)",
  ],
  moduleNameMapper: {
    "^@commando/ui/(.*)$": "<rootDir>/packages/ui/src/$1",
    "^@commando/shared/(.*)$": "<rootDir>/packages/shared/$1",
    "^.+\\.(css|scss|sass|less)$": "<rootDir>/packages/ui/jest/__mocks__/styleMock.cjs",
    "^uuid$": "<rootDir>/packages/ui/jest/__mocks__/uuid.cjs",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  resolver: "<rootDir>/packages/ui/jest/resolver/workerModulePathResolver.cjs",
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
};
