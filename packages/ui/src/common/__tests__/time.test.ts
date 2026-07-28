import { formatFileTime, toDateFromUnix } from "../time";

describe("time", () => {
    it("converts Unix seconds to Date", () => {
        const date = toDateFromUnix(1_700_000_000);
        expect(date?.getFullYear()).toBeGreaterThan(2020);
    });

    it("formats Go backend mtime seconds correctly", () => {
        const formatted = formatFileTime(1_700_000_000);
        expect(formatted).not.toContain("1970");
    });
});
