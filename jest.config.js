module.exports = {
    testEnvironment: "jsdom",
    preset: "ts-jest",
    roots: ["<rootDir>/src"],
    moduleFileExtensions: ["ts", "tsx", "js", "json"],
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    testMatch: [
        "**/__tests__/**/*.(spec|test).(ts|tsx|js)",
        "**/?(*.)+(spec|test).(ts|tsx|js)",
    ],
    globals: {
        "ts-jest": {
            tsconfig: "tsconfig.json",
        },
    },
    moduleNameMapper: {
        // 支持绝对路径别名（如有需要可补充）
        "^@main/(.*)$": "<rootDir>/src/main/$1",
        "^@preload/(.*)$": "<rootDir>/src/preload/$1",
        "^@renderer/(.*)$": "<rootDir>/src/renderer/$1",
    },
    setupFilesAfterEnv: ["@testing-library/jest-dom"],
    // 可根据需要添加 coverage、mock、setupFiles 等配置
};
