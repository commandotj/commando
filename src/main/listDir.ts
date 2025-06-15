import fs from 'fs';
import path from 'path';

export function listDirSync(dirPath: string) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((entry) => {
        let size = undefined;
        let mtime = undefined;
        try {
            const stat = fs.statSync(path.join(dirPath, entry.name));
            if (!entry.isDirectory()) {
                size = stat.size;
            }
            mtime = stat.mtimeMs; // 以 ms 时间戳返回
        } catch (e) {
            size = undefined;
            mtime = undefined;
        }
        return {
            name: entry.name,
            isDirectory: entry.isDirectory(),
            size,
            mtime
        };
    });
}
