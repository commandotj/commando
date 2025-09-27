module.exports = {
  testEnvironment: "jsdom",
  preset: "ts-jest",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // 如有其他 ts-jest 配置项，补充于此
      },
    ],
  },
  testMatch: [
    "**/__tests__/**/*.(spec|test).(ts|tsx|js)",
    "**/?(*.)+(spec|test).(ts|tsx|js)",
  ],
  moduleNameMapper: {
    // 支持绝对路径别名（如有需要可补充）
    "^@main/(.*)$": "<rootDir>/src/main/$1",
    "^@preload/(.*)$": "<rootDir>/src/preload/$1",
    "^@renderer/(.*)$": "<rootDir>/src/renderer/$1",
    "^.+\\.(css|scss|sass|less)$": "<rootDir>/jest/__mocks__/styleMock.js",
    "^uuid$": "<rootDir>/jest/__mocks__/uuid.js",
  },
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  resolver: "./jest/resolver/workerModulePathResolver.js",
  transformIgnorePatterns: ["node_modules/(?!(uuid)/)"],
  // 可根据需要添加 coverage、mock、setupFiles 等配置
};
