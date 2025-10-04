/**
 * Shared Worker Pool Management System
 * Handles worker lifecycle, load balancing, and communication protocol
 * Uses Vite ?modulePath syntax for proper worker imports
 */

import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import logger from "../../log/logger";

// 引入常量管理系统（按RFC-2025-002）
import {
    WORKER_TYPE_REGISTERED,
    WORKER_CREATED,
    ORPHANED_WORKER_MESSAGE,
} from "../../../common/constants/LogMessages";
import {
    WORKER_TYPE_NOT_REGISTERED,
    WORKER_SCRIPT_NOT_FOUND,
    WORKER_TIMEOUT,
} from "../../../common/constants/ErrorMessages";

// Worker factory registry - Services register their own worker factories
const workerFactories: Record<string, () => Worker> = {};

// Standard worker communication protocol
export interface WorkerMessage {
    id: string;
    type: "request" | "response" | "progress" | "error";
    operation: string;
    payload?: unknown;
    progress?: number;
    error?: string;
    timestamp: number;
}

export interface WorkerRequest extends WorkerMessage {
    type: "request";
    operation: string;
    payload: unknown;
}

export interface WorkerResponse extends WorkerMessage {
    type: "response";
    result?: unknown;
}

export interface WorkerProgress extends WorkerMessage {
    type: "progress";
    progress: number;
    currentItem?: string;
    completedFiles?: number;
    totalFiles?: number;
    // Additional payload forwarded from workers (e.g., bytes processed)
    detail?: Record<string, unknown>;
}

export interface WorkerError extends WorkerMessage {
    type: "error";
    error: string;
}

// Worker configuration
export interface WorkerConfig {
    maxWorkers: number;
    idleTimeout?: number; // ms to keep idle workers alive
    maxRetries?: number;
}

// Worker instance wrapper
class WorkerInstance extends EventEmitter {
    public readonly id: string;
    public readonly worker: Worker;
    public isIdle: boolean = true;
    public currentTask: string | null = null;
    public lastActivity: number = Date.now();
    private pendingRequests = new Map<
        string,
        {
            resolve: (value: unknown) => void;
            reject: (error: Error) => void;
            onProgress?: (progress: WorkerProgress) => void;
        }
    >();

    constructor(workerScript: string, workerData?: unknown) {
        super();
        this.id = uuidv4();

        // Use Vite createWorker function instead of direct path resolution
        const createWorker = workerFactories[workerScript];
        if (!createWorker) {
            throw new Error(WORKER_SCRIPT_NOT_FOUND);
        }

        this.worker = createWorker();
        // Set workerData if provided (may need to be passed differently depending on worker implementation)
        if (workerData) {
            this.worker.postMessage({ type: "init", data: workerData });
        }

        this.setupMessageHandling();
        this.setupErrorHandling();
    }

    private setupMessageHandling(): void {
        this.worker.on("message", (message: WorkerMessage) => {
            this.lastActivity = Date.now();
            const pending = this.pendingRequests.get(message.id);

            if (!pending) {
                logger.warn(ORPHANED_WORKER_MESSAGE, {
                    messageId: message.id,
                    workerId: this.id,
                });
                return;
            }

            switch (message.type) {
                case "response":
                    this.pendingRequests.delete(message.id);
                    this.isIdle = true;
                    this.currentTask = null;
                    pending.resolve((message as WorkerResponse).result);
                    break;

                case "progress":
                    if (pending.onProgress) {
                        pending.onProgress(message as WorkerProgress);
                    }
                    break;

                case "error":
                    this.pendingRequests.delete(message.id);
                    this.isIdle = true;
                    this.currentTask = null;
                    pending.reject(new Error((message as WorkerError).error));
                    break;
            }
        });
    }

    private setupErrorHandling(): void {
        this.worker.on("error", error => {
            logger.error(`Worker ${this.id} error`, { error: error.message });

            // Reject all pending requests
            this.pendingRequests.forEach(({ reject }) => {
                reject(new Error(`Worker error: ${error.message}`));
            });
            this.pendingRequests.clear();

            this.emit("error", error);
        });

        this.worker.on("exit", code => {
            if (code !== 0) {
                logger.error(`Worker ${this.id} exited with code ${code}`);
            }
            this.emit("exit", code);
        });
    }

    async execute<T = unknown>(
        operation: string,
        payload: unknown,
        onProgress?: (progress: WorkerProgress) => void
    ): Promise<T> {
        if (!this.isIdle) {
            throw new Error(
                `Worker ${this.id} is busy with ${this.currentTask}`
            );
        }

        const requestId = uuidv4();
        const request: WorkerRequest = {
            id: requestId,
            type: "request",
            operation,
            payload,
            timestamp: Date.now(),
        };

        return new Promise<T>((resolve, reject) => {
            this.pendingRequests.set(requestId, {
                resolve: resolve as (value: unknown) => void,
                reject,
                onProgress,
            });
            this.isIdle = false;
            this.currentTask = operation;
            this.worker.postMessage(request);
        });
    }

    terminate(): void {
        this.worker.terminate();
        this.pendingRequests.clear();
    }

    get idleTime(): number {
        return Date.now() - this.lastActivity;
    }
}

// Main worker pool class
export class WorkerPool {
    private static instance: WorkerPool;
    private workerConfigs = new Map<string, WorkerConfig>();
    private workerPools = new Map<string, WorkerInstance[]>();
    private roundRobinIndices = new Map<string, number>();

    private constructor() {
        // Singleton pattern implementation
    }

    static getInstance(): WorkerPool {
        if (!this.instance) {
            this.instance = new WorkerPool();
        }
        return this.instance;
    }

    registerWorkerType(
        name: string,
        config: WorkerConfig,
        workerFactory: () => Worker
    ): void {
        // Register the worker factory provided by the service
        workerFactories[name] = workerFactory;

        this.workerConfigs.set(name, {
            ...config,
            idleTimeout: config.idleTimeout || 300000, // 5 minutes default
            maxRetries: config.maxRetries || 3,
        });

        this.workerPools.set(name, []);
        this.roundRobinIndices.set(name, 0);

        logger.info(WORKER_TYPE_REGISTERED, {
            workerType: name,
            maxWorkers: config.maxWorkers,
        });
    }

    async execute<T = unknown>(
        workerType: string,
        operation: string,
        payload: unknown,
        onProgress?: (progress: WorkerProgress) => void,
        retryCount: number = 0
    ): Promise<T> {
        const config = this.workerConfigs.get(workerType);
        if (!config) {
            throw new Error(WORKER_TYPE_NOT_REGISTERED);
        }

        try {
            const worker = await this.getOrCreateWorker(workerType);
            return await worker.execute<T>(operation, payload, onProgress);
        } catch (error) {
            logger.error(`Worker execution failed`, {
                workerType,
                operation,
                error: error instanceof Error ? error.message : String(error),
                retryCount,
            });

            // Retry logic
            if (retryCount < (config.maxRetries || 0)) {
                logger.info(
                    `Retrying operation ${operation} (attempt ${retryCount + 1})`
                );
                return this.execute<T>(
                    workerType,
                    operation,
                    payload,
                    onProgress,
                    retryCount + 1
                );
            }

            throw error;
        }
    }

    private async getOrCreateWorker(
        workerType: string
    ): Promise<WorkerInstance> {
        const pool = this.workerPools.get(workerType)!;
        const config = this.workerConfigs.get(workerType)!;

        // Try to find an idle worker
        const idleWorker = pool.find(w => w.isIdle);
        if (idleWorker) {
            return idleWorker;
        }

        // Create new worker if under limit
        if (pool.length < config.maxWorkers) {
            const worker = new WorkerInstance(workerType, { workerType });

            worker.on("error", () => {
                this.removeWorker(workerType, worker);
            });

            worker.on("exit", () => {
                this.removeWorker(workerType, worker);
            });

            pool.push(worker);
            logger.info(WORKER_CREATED, {
                workerType,
                workerId: worker.id,
                poolSize: pool.length,
            });

            return worker;
        }

        // Use round-robin to select least recently used worker
        const index = this.roundRobinIndices.get(workerType) || 0;
        const worker = pool[index % pool.length];
        this.roundRobinIndices.set(workerType, (index + 1) % pool.length);

        // Wait for worker to become available
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(WORKER_TIMEOUT));
            }, 30000); // 30 second timeout

            const checkIdle = (): void => {
                if (worker.isIdle) {
                    clearTimeout(timeout);
                    resolve(worker);
                } else {
                    setTimeout(checkIdle, 100);
                }
            };

            checkIdle();
        });
    }

    private removeWorker(workerType: string, worker: WorkerInstance): void {
        const pool = this.workerPools.get(workerType);
        if (pool) {
            const index = pool.indexOf(worker);
            if (index > -1) {
                pool.splice(index, 1);
                logger.info(
                    `Removed worker ${worker.id} from pool ${workerType}`
                );
            }
        }
    }

    async cleanup(): Promise<void> {
        logger.info("Cleaning up worker pool");

        const cleanupPromises: Promise<void>[] = [];

        this.workerPools.forEach(pool => {
            pool.forEach(worker => {
                cleanupPromises.push(
                    new Promise(resolve => {
                        worker.terminate();
                        resolve();
                    })
                );
            });
        });

        await Promise.all(cleanupPromises);

        this.workerPools.clear();
        this.roundRobinIndices.clear();
    }

    getPoolStats(): Record<
        string,
        { total: number; idle: number; busy: number }
    > {
        const stats: Record<
            string,
            { total: number; idle: number; busy: number }
        > = {};

        this.workerPools.forEach((pool, workerType) => {
            const idle = pool.filter(w => w.isIdle).length;
            const busy = pool.length - idle;

            stats[workerType] = {
                total: pool.length,
                idle,
                busy,
            };
        });

        return stats;
    }

    // Periodic cleanup of idle workers
    startIdleWorkerCleanup(): void {
        setInterval(() => {
            this.workerPools.forEach((pool, workerType) => {
                const config = this.workerConfigs.get(workerType);
                if (!config) return;

                const idleWorkers = pool.filter(
                    w => w.isIdle && w.idleTime > (config.idleTimeout || 300000)
                );

                idleWorkers.forEach(worker => {
                    this.removeWorker(workerType, worker);
                    worker.terminate();
                });

                if (idleWorkers.length > 0) {
                    logger.info(
                        `Cleaned up ${idleWorkers.length} idle workers for ${workerType}`
                    );
                }
            });
        }, 60000); // Check every minute
    }
}

export default WorkerPool;
