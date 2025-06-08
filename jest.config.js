module.exports = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    testMatch: [
        "<rootDir>/src/**/**/__tests__/**/*.test.(ts|tsx)",
        "<rootDir>/electron/main/**/__tests__/**/*.test.(ts|tsx|js)",
    ],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json",
            },
        ],
    },
};
