/**
 * 错误消息常量
 * 定义系统中所有错误消息的标准化文本
 */

// 参数验证错误
export const INVALID_PARAMS_REQUIRED_MISSING =
  "Invalid parameters: required field missing" as const;
export const INVALID_PARAMS_WRONG_TYPE =
  "Invalid parameters: incorrect parameter type" as const;
export const INVALID_PATH_FORMAT = "Invalid file path format" as const;

// 文件系统错误
export const FILE_NOT_FOUND = "Specified file or directory not found" as const;
export const FILE_ACCESS_DENIED = "Access denied to file or directory" as const;
export const FILE_ALREADY_EXISTS = "File or directory already exists" as const;
export const DISK_SPACE_INSUFFICIENT =
  "Insufficient disk space for operation" as const;

// Worker相关错误
export const WORKER_CREATION_FAILED =
  "Failed to create worker instance" as const;
export const WORKER_COMMUNICATION_FAILED =
  "Worker communication error" as const;
export const WORKER_TIMEOUT = "Worker operation timeout" as const;
export const WORKER_POOL_EXHAUSTED = "Worker pool resources exhausted" as const;
export const WORKER_SCRIPT_NOT_FOUND = "Worker script not found" as const;
export const WORKER_TYPE_NOT_REGISTERED = "Worker type not registered" as const;

// 服务错误
export const SERVICE_NOT_REGISTERED =
  "Requested service is not registered" as const;
export const SERVICE_INITIALIZATION_FAILED =
  "Service initialization failed" as const;
export const SERVICE_UNAVAILABLE = "Service temporarily unavailable" as const;

// 任务执行错误
export const TASK_EXECUTION_FAILED = "Task execution failed" as const;
export const TASK_TIMEOUT = "Task execution timeout" as const;
export const TASK_CANCELLED = "Task was cancelled" as const;
export const TASK_NOT_FOUND = "Task not found" as const;

// 系统错误
export const SYSTEM_OVERLOADED =
  "System is overloaded, please try again later" as const;
export const MEMORY_EXHAUSTED = "System memory exhausted" as const;
export const CONFIGURATION_ERROR = "System configuration error" as const;

export const ErrorMessages = {
  INVALID_PARAMS_REQUIRED_MISSING,
  INVALID_PARAMS_WRONG_TYPE,
  INVALID_PATH_FORMAT,
  FILE_NOT_FOUND,
  FILE_ACCESS_DENIED,
  FILE_ALREADY_EXISTS,
  DISK_SPACE_INSUFFICIENT,
  WORKER_CREATION_FAILED,
  WORKER_COMMUNICATION_FAILED,
  WORKER_TIMEOUT,
  WORKER_POOL_EXHAUSTED,
  WORKER_SCRIPT_NOT_FOUND,
  WORKER_TYPE_NOT_REGISTERED,
  SERVICE_NOT_REGISTERED,
  SERVICE_INITIALIZATION_FAILED,
  SERVICE_UNAVAILABLE,
  TASK_EXECUTION_FAILED,
  TASK_TIMEOUT,
  TASK_CANCELLED,
  TASK_NOT_FOUND,
  SYSTEM_OVERLOADED,
  MEMORY_EXHAUSTED,
  CONFIGURATION_ERROR,
} as const;

export type ErrorMessageValue =
  (typeof ErrorMessages)[keyof typeof ErrorMessages];
