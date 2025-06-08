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

    it("returns file and directory entries with size for files", () => {
        (fs.readdirSync as jest.Mock).mockReturnValue([
            { name: "file.txt", isDirectory: () => false } as any,
            { name: "folder", isDirectory: () => true } as any,
        ]);
        (fs.statSync as jest.Mock).mockReturnValueOnce({ size: 1234 } as any);

        const result = listDirSync("/mock/path");
        expect(result).toEqual([
            { name: "file.txt", isDirectory: false, size: 1234 },
            { name: "folder", isDirectory: true, size: undefined },
        ]);
    });
});
