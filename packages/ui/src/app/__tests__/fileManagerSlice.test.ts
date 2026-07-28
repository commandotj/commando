import fileManagerReducer, { setPanePath } from "../fileManagerSlice";

describe("fileManagerSlice", () => {
    it("updates currentPath without auto-setting syncRoot", () => {
        const state = fileManagerReducer(
            undefined,
            setPanePath({ paneIndex: 0, path: "/Users/alice/Projects" })
        );

        expect(state.panes[0].currentPath).toBe("/Users/alice/Projects");
        expect(state.panes[0].syncRoot).toBe("");
    });
});
