import { normalizeExecuteResult } from "../normalizeExecuteResult";

describe("normalizeExecuteResult", () => {
    it("coerces null errors to empty array", () => {
        const result = normalizeExecuteResult({
            copied: 10,
            skipped: 2,
            deleted: 0,
            errors: null as unknown as string[],
        });
        expect(result.errors).toEqual([]);
    });
});
