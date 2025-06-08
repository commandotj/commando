import fs from "fs";
import { listDirSync } from "../listDir";

jest.mock("fs");

describe("listDirSync", () => {
    it("returns file and directory entries with size for files", () => {
        (fs as any).readdirSync.mockReturnValue([
            { name: "file.txt", isDirectory: () => false },
            { name: "folder", isDirectory: () => true },
        ]);
        (fs as any).statSync.mockReturnValueOnce({ size: 1234 });

        const result = listDirSync("/mock/path");
        expect(result).toEqual([
            { name: "file.txt", isDirectory: false, size: 1234 },
            { name: "folder", isDirectory: true, size: undefined },
        ]);
    });
});
