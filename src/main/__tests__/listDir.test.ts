import fs from "fs";
import path from "path";
import { listDirSync } from "../listDir";

describe("listDirSync", () => {
    const testDir = path.join(__dirname, "tmp-listdir");
    const fileA = path.join(testDir, "a.txt");
    const fileB = path.join(testDir, "b.txt");
    const subDir = path.join(testDir, "sub");

    beforeAll(() => {
        fs.mkdirSync(testDir, { recursive: true });
        fs.writeFileSync(fileA, "hello");
        fs.writeFileSync(fileB, "world");
        fs.mkdirSync(subDir, { recursive: true });
    });

    afterAll(() => {
        fs.rmSync(testDir, { recursive: true, force: true });
    });

    it("should list all files and directories", () => {
        const result = listDirSync(testDir);
        const names = result.map((e) => e.name);
        expect(names).toEqual(
            expect.arrayContaining(["a.txt", "b.txt", "sub"])
        );
        const a = result.find((e) => e.name === "a.txt");
        expect(a?.isDirectory).toBe(false);
        expect(typeof a?.size).toBe("number");
        expect(typeof a?.mtime).toBe("number");
        const sub = result.find((e) => e.name === "sub");
        expect(sub?.isDirectory).toBe(true);
        expect(sub?.size).toBeUndefined();
    });

    it("should return empty array for empty dir", () => {
        const emptyDir = path.join(testDir, "empty");
        fs.mkdirSync(emptyDir, { recursive: true });
        expect(listDirSync(emptyDir)).toEqual([]);
    });

    it("should handle stat error gracefully", () => {
        // mock fs.statSync 抛异常
        const spy = jest.spyOn(fs, "statSync").mockImplementation(() => {
            throw new Error("fail");
        });
        const result = listDirSync(testDir);
        expect(
            result.every((e) => e.size === undefined && e.mtime === undefined)
        ).toBe(true);
        spy.mockRestore();
    });
});
