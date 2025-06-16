const fs = require("fs");
const path = require("path");

const workerPattern = /\bfrom\s+['"](.+?\?modulePath)['"]/g;
const srcDir = "src/main";

function findWorkerImportsInDir(dir) {
    let files = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(findWorkerImportsInDir(fullPath));
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
            files.push(fullPath);
        }
    });
    return files;
}

function extractWorkerPaths(files) {
    const workerPaths = new Set();
    files.forEach((file) => {
        const content = fs.readFileSync(file, "utf-8");
        let match;
        while ((match = workerPattern.exec(content))) {
            workerPaths.add(match[1]);
        }
    });
    return Array.from(workerPaths);
}

function genTypeDef(workerPaths) {
    return [
        "// vite-worker-module-path.d.ts (auto-generated)",
        ...workerPaths.map(
            (p) =>
                `declare module "${p}" {\n  const workerPath: string;\n  export default workerPath;\n}`
        ),
        'declare module "*?modulePath" {',
        "  const workerPath: string;",
        "  export default workerPath;",
        "}",
        "",
    ].join("\n");
}

function genJestResolver() {
    return `
// workerModulePathResolver.js (auto-generated)
module.exports = (request, options) => {
    // Remove ?modulePath query for worker imports
    if (request.endsWith('?modulePath')) {
        const noQuery = request.replace('?modulePath', '');
        return options.defaultResolver(noQuery, options);
    }
    return options.defaultResolver(request, options);
};
`.trim();
}

function main() {
    if (!fs.existsSync(srcDir)) {
        console.error("src/main 目录不存在，无法生成 worker 支持文件。");
        process.exit(1);
    }
    const files = findWorkerImportsInDir(srcDir);
    const workerPaths = extractWorkerPaths(files);

    // 1. 生成类型声明到 ./typings/vite-worker-module-path/index.d.ts
    const typingsDir = path.join(
        process.cwd(),
        "typings/vite-worker-module-path"
    );
    if (!fs.existsSync(typingsDir)) {
        fs.mkdirSync(typingsDir, { recursive: true });
    }
    fs.writeFileSync(
        path.join(typingsDir, "index.d.ts"),
        genTypeDef(workerPaths),
        "utf-8"
    );

    // 2. 生成 jest resolver
    fs.writeFileSync(
        "jest/resolver/workerModulePathResolver.js",
        genJestResolver(),
        "utf-8"
    );

    console.log(
        "✔️  Worker modulePath resolver/type-def generated for src/main."
    );
}

main();
