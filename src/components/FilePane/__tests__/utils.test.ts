import { splitPath, joinPath, formatSize } from "../utils";

describe("FilePane utils", () => {
    describe("splitPath", () => {
        it("should split Unix paths correctly", () => {
            expect(splitPath("/home/user/documents")).toEqual([
                "home",
                "user",
                "documents",
            ]);
            expect(splitPath("home/user/documents")).toEqual([
                "home",
                "user",
                "documents",
            ]);
        });

        it("should split Windows paths correctly", () => {
            expect(splitPath("C:\\Users\\Documents")).toEqual([
                "C:",
                "Users",
                "Documents",
            ]);
            expect(splitPath("C:/Users/Documents")).toEqual([
                "C:",
                "Users",
                "Documents",
            ]);
        });

        it("should handle empty paths", () => {
            expect(splitPath("")).toEqual([]);
            expect(splitPath("/")).toEqual([]);
            expect(splitPath("\\")).toEqual([]);
        });
    });

    describe("joinPath", () => {
        it("should join Unix paths correctly", () => {
            expect(joinPath("/home/user", "documents")).toBe(
                "/home/user/documents"
            );
            expect(joinPath("/home/user/", "documents")).toBe(
                "/home/user/documents"
            );
        });

        it("should join Windows paths correctly", () => {
            expect(joinPath("C:\\Users", "Documents")).toBe(
                "C:\\Users\\Documents"
            );
            expect(joinPath("C:/Users", "Documents")).toBe(
                "C:/Users/Documents"
            );
        });

        it("should handle paths with trailing slashes", () => {
            expect(joinPath("/home/user/", "documents")).toBe(
                "/home/user/documents"
            );
            expect(joinPath("C:\\Users\\", "Documents")).toBe(
                "C:\\Users\\Documents"
            );
        });
    });

    describe("formatSize", () => {
        it("should format bytes correctly", () => {
            expect(formatSize(0)).toBe("0 B");
            expect(formatSize(500)).toBe("500.00 B");
            expect(formatSize(1024)).toBe("1.00 KB");
            expect(formatSize(1024 * 1024)).toBe("1.00 MB");
            expect(formatSize(1024 * 1024 * 1024)).toBe("1.00 GB");
            expect(formatSize(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
        });

        it("should handle undefined and null values", () => {
            expect(formatSize(undefined)).toBe("");
            expect(formatSize(null as any)).toBe("");
        });

        it("should handle large numbers", () => {
            expect(formatSize(1024 * 1024 * 1024 * 1024 * 2)).toBe("2.00 TB");
        });

        it("should handle decimal values", () => {
            expect(formatSize(1500)).toBe("1.46 KB");
            expect(formatSize(1500000)).toBe("1.43 MB");
        });
    });
});
