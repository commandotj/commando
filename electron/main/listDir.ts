import fs from "fs";
import path from "path";

export function listDirSync(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((entry) => {
        let size = undefined;
        if (!entry.isDirectory()) {
            try {
                const stat = fs.statSync(path.join(dirPath, entry.name));
                size = stat.size;
            } catch (e) {
                size = undefined;
            }
        }
        return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size,
        };
    });
}
