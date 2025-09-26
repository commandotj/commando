declare module "*?nodeWorker" {
    import { Worker } from "worker_threads";
    const createWorker: () => Worker;
    export default createWorker;
}
