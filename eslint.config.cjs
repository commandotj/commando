const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const prettier = require("eslint-config-prettier");

module.exports = [
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            "dist-electron/**",
            "build/**",
            ".vscode/**",
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: "module",
                ecmaFeatures: { jsx: true },
            },
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                HTMLElement: "readonly",
                DocumentReadyState: "readonly",
                URL: "readonly",
                postMessage: "readonly",
                // Node.js globals
                process: "readonly",
                __dirname: "readonly",
                module: "readonly",
                require: "readonly",
                NodeJS: "readonly",
                // Common globals
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
            react: reactPlugin,
            "react-hooks": reactHooks,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "no-undef": "error",
            "@typescript-eslint/ban-ts-comment": [
                "error",
                { "ts-expect-error": "allow-with-description" },
            ],
            "no-extra-boolean-cast": "error",
        },
        settings: {
            react: { version: "detect" },
        },
    },
    {
        files: ["**/*.test.ts", "**/*.test.tsx", "jest.config.js"],
        languageOptions: {
            globals: {
                jest: "readonly",
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                beforeEach: "readonly",
            },
        },
    },
    {
        files: ["electron/**/*.ts"],
        languageOptions: {
            globals: {
                require: "readonly",
                module: "readonly",
                process: "readonly",
                __dirname: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    prettier,
];
