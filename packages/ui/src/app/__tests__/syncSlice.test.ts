import syncReducer, { compareSync, setStrategyId } from "../syncSlice";
import { SYNC_STRATEGY_IDS } from "../../constants/sync";

describe("syncSlice", () => {
    it("sets strategy and deleteExtraneous flag", () => {
        const state = syncReducer(
            undefined,
            setStrategyId(SYNC_STRATEGY_IDS.MIRROR_RIGHT)
        );
        expect(state.strategyId).toBe(SYNC_STRATEGY_IDS.MIRROR_RIGHT);
        expect(state.options.deleteExtraneous).toBe(true);
    });

    it("marks error when compare rejected", () => {
        const state = syncReducer(
            undefined,
            compareSync.rejected(
                new Error("fail"),
                "",
                undefined,
                "roots missing"
            )
        );
        expect(state.status).toBe("error");
        expect(state.error).toBeTruthy();
    });
});
