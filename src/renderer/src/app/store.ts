import { configureStore } from "@reduxjs/toolkit";
import fileManagerReducer from "./fileManagerSlice";
import clipboardReducer from "./clipboardSlice";
import fileOperationsReducer from "./fileOperationsSlice";

const store = configureStore({
    reducer: {
        fileManager: fileManagerReducer,
        clipboard: clipboardReducer,
        fileOperations: fileOperationsReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
