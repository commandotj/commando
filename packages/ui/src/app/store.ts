import { configureStore } from "@reduxjs/toolkit";
import fileManagerReducer from "./fileManagerSlice";
import clipboardReducer from "./clipboardSlice";
import fileOperationsReducer from "./fileOperationsSlice";
import driveReducer from "./driveSlice";

import syncReducer from "./syncSlice";

const store = configureStore({
    reducer: {
        fileManager: fileManagerReducer,
        sync: syncReducer,
        clipboard: clipboardReducer,
        fileOperations: fileOperationsReducer,
        drive: driveReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
