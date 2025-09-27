import { configureStore } from "@reduxjs/toolkit";
import fileManagerReducer from "./fileManagerSlice";
import clipboardReducer from "./clipboardSlice";
import fileOperationsReducer from "./fileOperationsSlice";
import driveReducer from "./driveSlice";

const store = configureStore({
  reducer: {
    fileManager: fileManagerReducer,
    clipboard: clipboardReducer,
    fileOperations: fileOperationsReducer,
    drive: driveReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
