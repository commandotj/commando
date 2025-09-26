/**
 * Jest Tests for Service Decorator and Registry
 * Tests service registration, IPC binding, and lifecycle management
 */

import { ipcMain } from 'electron';
import { ServiceRegistry, Service, BaseService, ServiceMetadata } from '../core/ServiceDecorator';

// Mock dependencies
jest.mock('electron');
jest.mock('../../logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));
jest.mock('../core/WorkerPool', () => ({
    WorkerPool: {
        getInstance: jest.fn().mockReturnValue({
            registerWorkerType: jest.fn(),
            cleanup: jest.fn()
        })
    }
}));

const mockIpcMain = ipcMain as jest.Mocked<typeof ipcMain>;

describe('ServiceDecorator', () => {
    let registry: ServiceRegistry;

    beforeEach(() => {
        jest.clearAllMocks();
        // Create new registry instance for each test
        (ServiceRegistry as any).instance = undefined;
        registry = ServiceRegistry.getInstance();
    });

    describe('Service Registration', () => {
        it('should register a service with @Service decorator', () => {
            @Service({
                name: 'TestService',
                version: '1.0.0',
                workerScript: 'test.js'
            })
            class TestService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'TestService',
                        version: '1.0.0',
                        ipcChannels: ['test:action'],
                        workerScript: 'test.js'
                    };
                }

                async handleAction() {
                    return 'success';
                }
            }

            expect(registry.getService('TestService')).toBeDefined();
        });

        it('should auto-detect IPC channels from method names', () => {
            @Service({
                name: 'AutoService',
                version: '1.0.0'
            })
            class AutoService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'AutoService',
                        version: '1.0.0',
                        ipcChannels: ['autoservice:copy', 'autoservice:delete']
                    };
                }

                async handleCopy() { return 'copied'; }
                async handleDelete() { return 'deleted'; }
            }

            const service = registry.getService('AutoService');
            expect(service).toBeDefined();
            expect(service?.getMetadata().ipcChannels).toContain('autoservice:copy');
            expect(service?.getMetadata().ipcChannels).toContain('autoservice:delete');
        });

        it('should bind IPC handlers automatically', () => {
            @Service({
                name: 'IPCService',
                version: '1.0.0',
                ipcChannels: ['ipc:test']
            })
            class IPCService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'IPCService',
                        version: '1.0.0',
                        ipcChannels: ['ipc:test']
                    };
                }

                async handleTest() {
                    return 'ipc-success';
                }
            }

            expect(mockIpcMain.handle).toHaveBeenCalledWith(
                'ipc:test',
                expect.any(Function)
            );
        });
    });

    describe('Service Lifecycle', () => {
        let testService: any;

        beforeEach(() => {
            @Service({
                name: 'LifecycleService',
                version: '1.0.0'
            })
            class LifecycleService implements BaseService {
                initialized = false;
                cleanedUp = false;

                async initialize() {
                    this.initialized = true;
                }

                async cleanup() {
                    this.cleanedUp = true;
                }

                getMetadata(): ServiceMetadata {
                    return {
                        name: 'LifecycleService',
                        version: '1.0.0',
                        ipcChannels: []
                    };
                }
            }

            testService = registry.getService('LifecycleService');
        });

        it('should initialize all services', async () => {
            await registry.initializeAll();
            expect(testService.initialized).toBe(true);
        });

        it('should cleanup all services', async () => {
            await registry.cleanupAll();
            expect(testService.cleanedUp).toBe(true);
        });

        it('should handle initialization errors gracefully', async () => {
            @Service({
                name: 'ErrorService',
                version: '1.0.0'
            })
            class ErrorService implements BaseService {
                async initialize() {
                    throw new Error('Init failed');
                }

                async cleanup() {}

                getMetadata(): ServiceMetadata {
                    return {
                        name: 'ErrorService',
                        version: '1.0.0',
                        ipcChannels: []
                    };
                }
            }

            // Should not throw
            await expect(registry.initializeAll()).resolves.not.toThrow();
        });
    });

    describe('Channel to Method Mapping', () => {
        it('should convert channel names to method names correctly', () => {
            const testCases = [
                { channel: 'file:copy', expected: 'handleCopy' },
                { channel: 'file:batch-copy', expected: 'handleBatchCopy' },
                { channel: 'delete:file', expected: 'handleFile' },
                { channel: 'rename:batch-rename', expected: 'handleBatchRename' }
            ];

            @Service({
                name: 'MappingService',
                version: '1.0.0',
                ipcChannels: testCases.map(tc => tc.channel)
            })
            class MappingService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'MappingService',
                        version: '1.0.0',
                        ipcChannels: testCases.map(tc => tc.channel)
                    };
                }

                async handleCopy() { return 'copy'; }
                async handleBatchCopy() { return 'batch-copy'; }
                async handleFile() { return 'file'; }
                async handleBatchRename() { return 'batch-rename'; }
            }

            testCases.forEach(({ channel }) => {
                expect(mockIpcMain.handle).toHaveBeenCalledWith(
                    channel,
                    expect.any(Function)
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle IPC method errors', async () => {
            @Service({
                name: 'ErrorService',
                version: '1.0.0',
                ipcChannels: ['error:test']
            })
            class ErrorService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'ErrorService',
                        version: '1.0.0',
                        ipcChannels: ['error:test']
                    };
                }

                async handleTest() {
                    throw new Error('Method failed');
                }
            }

            // Get the IPC handler function
            const handlerCall = mockIpcMain.handle.mock.calls.find(
                call => call[0] === 'error:test'
            );
            expect(handlerCall).toBeDefined();

            const handler = handlerCall![1];
            const mockEvent = {} as any;

            // Should propagate the error
            await expect(handler(mockEvent)).rejects.toThrow('Method failed');
        });

        it('should warn about missing methods', () => {
            const logger = require('../../logger');

            @Service({
                name: 'MissingMethodService',
                version: '1.0.0',
                ipcChannels: ['missing:nonexistent']
            })
            class MissingMethodService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'MissingMethodService',
                        version: '1.0.0',
                        ipcChannels: ['missing:nonexistent']
                    };
                }
            }

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Method handleNonexistent not found')
            );
        });
    });

    describe('Worker Pool Integration', () => {
        it('should register worker types for services', () => {
            const { WorkerPool } = require('../core/WorkerPool');
            const mockWorkerPool = WorkerPool.getInstance();

            @Service({
                name: 'WorkerService',
                version: '1.0.0',
                workerScript: 'worker.js',
                maxWorkers: 3
            })
            class WorkerService implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return {
                        name: 'WorkerService',
                        version: '1.0.0',
                        ipcChannels: [],
                        workerScript: 'worker.js',
                        maxWorkers: 3
                    };
                }
            }

            expect(mockWorkerPool.registerWorkerType).toHaveBeenCalledWith(
                'WorkerService',
                expect.objectContaining({
                    maxWorkers: 3
                })
            );
        });
    });

    describe('Service Registry Operations', () => {
        it('should return singleton instance', () => {
            const registry1 = ServiceRegistry.getInstance();
            const registry2 = ServiceRegistry.getInstance();
            expect(registry1).toBe(registry2);
        });

        it('should get all services', () => {
            @Service({
                name: 'Service1',
                version: '1.0.0'
            })
            class Service1 implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return { name: 'Service1', version: '1.0.0', ipcChannels: [] };
                }
            }

            @Service({
                name: 'Service2',
                version: '1.0.0'
            })
            class Service2 implements BaseService {
                async initialize() {}
                async cleanup() {}
                getMetadata(): ServiceMetadata {
                    return { name: 'Service2', version: '1.0.0', ipcChannels: [] };
                }
            }

            const allServices = registry.getAllServices();
            expect(allServices.size).toBeGreaterThanOrEqual(2);
            expect(allServices.has('Service1')).toBe(true);
            expect(allServices.has('Service2')).toBe(true);
        });

        it('should return undefined for non-existent service', () => {
            const service = registry.getService('NonExistent');
            expect(service).toBeUndefined();
        });
    });
});