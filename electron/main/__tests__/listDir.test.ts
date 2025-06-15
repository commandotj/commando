import fs from "fs";
import { listDirSync } from "../listDir";

jest.mock("fs", () => ({
    default: {
        readdirSync: jest.fn(),
        statSync: jest.fn(),
    },
}));

jest.mock("path", () => ({
    default: {
        join: jest.fn(),
    },
}));

describe("listDirSync", () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.resetAllMocks();
    });

    it("returns file and directory entries with size and mtime for files", () => {
        (fs.readdirSync as jest.Mock).mockReturnValue([
            { name: "file.txt", isDirectory: () => false } as any,
            { name: "folder", isDirectory: () => true } as any,
        ]);
        (fs.statSync as jest.Mock)
            .mockReturnValueOnce({ size: 1234, mtimeMs: 1680000000000 })
            .mockReturnValueOnce({ mtimeMs: 1680001111111 });

        const result = listDirSync("/mock/path");
        expect(result).toEqual([
            {
                name: "file.txt",
                isDirectory: false,
                size: 1234,
                mtime: 1680000000000,
            },
            {
                name: "folder",
                isDirectory: true,
                size: undefined,
                mtime: 1680001111111,
            },
        ]);
    });

    it("handles statSync error gracefully", () => {
        (fs.readdirSync as jest.Mock).mockReturnValue([
            { name: "file.txt", isDirectory: () => false } as any,
        ]);
        (fs.statSync as jest.Mock).mockImplementation(() => {
            throw new Error("fail");
        });

        const result = listDirSync("/mock/path");
        expect(result).toEqual([
            {
                name: "file.txt",
                isDirectory: false,
                size: undefined,
                mtime: undefined,
            },
        ]);
    });
});
