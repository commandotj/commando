/**
 * Services Registry and Initialization
 * Central point for registering and managing all application services
 */

import { BrowserWindow } from "electron"
import { serviceRegistry } from "./core/ServiceDecorator"
import CopyService from "./CopyService"
// import EnhancedCopyService from "./EnhancedCopyService"
import FileService from "./FileService"
import DirectoryService from "./DirectoryService"
import DriveService from "./DriveService"
import ShellService from "./ShellService"
import WindowService from "./WindowService"
import logger from "@main/log/logger"
import type { ServiceRegistry } from "./core/ServiceDecorator"

/**
 * Initialize all application services with mainWindow injection
 * This should be called after the main window is created
 *
 * @param mainWindow - The main BrowserWindow instance
 */
export async function initializeServices(mainWindow: BrowserWindow): Promise<void> {
    try {
        logger.info("Initializing application services")

        // Set mainWindow for all services
        serviceRegistry.setMainWindow(mainWindow)

        // Register all services - they will automatically receive mainWindow
        logger.info("Registering CopyService")
        serviceRegistry.register(CopyService)

        // logger.info("Registering EnhancedCopyService")
        // serviceRegistry.register(EnhancedCopyService)

        logger.info("Registering FileService")
        serviceRegistry.register(FileService)

        logger.info("Registering DirectoryService")
        serviceRegistry.register(DirectoryService)

        logger.info("Registering DriveService")
        serviceRegistry.register(DriveService)

        logger.info("Registering ShellService")
        serviceRegistry.register(ShellService)

        logger.info("Registering WindowService")
        serviceRegistry.register(WindowService)

        // Initialize all registered services
        await serviceRegistry.initializeAll()

        logger.info("All services initialized successfully", {
            serviceCount: serviceRegistry.getAllServices().size,
        })
    } catch (error) {
        logger.error("Failed to initialize services", {
            error: error instanceof Error ? error.message : String(error),
        })
        throw error
    }
}

/**
 * Cleanup all services during application shutdown
 */
export async function cleanupServices(): Promise<void> {
    try {
        logger.info("Cleaning up application services")
        await serviceRegistry.cleanupAll()
        logger.info("All services cleaned up successfully")
    } catch (error) {
        logger.error("Failed to cleanup services", {
            error: error instanceof Error ? error.message : String(error),
        })
    }
}

/**
 * Get the service registry instance for direct access
 */
export function getServiceRegistry(): ServiceRegistry {
    return serviceRegistry
}
