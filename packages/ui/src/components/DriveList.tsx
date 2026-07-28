import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { fetchDrives, refreshDrives } from "../app/driveSlice";
import { useDriveEvents } from "../hooks/useDriveEvents";
import type { DriveInfo } from "@commando/shared/types/DriveTypes";
import {
    Box,
    VStack,
    HStack,
    Text,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Progress,
    Badge,
    IconButton,
    Tooltip,
} from "@chakra-ui/react";
import {
    UpdateIcon,
    DesktopIcon,
    DiscIcon,
    ComponentInstanceIcon,
} from "@radix-ui/react-icons";

export const DriveList: React.FC = () => {
    const dispatch = useAppDispatch();
    const { drives, loading, error, loadingMessage } = useAppSelector(
        state => state.drive
    );

    // 监听 IPC 事件
    useDriveEvents();

    // 组件挂载时获取驱动器列表
    useEffect(() => {
        dispatch(fetchDrives());
    }, [dispatch]);

    // 格式化文件大小
    const formatSize = (bytes: number): string => {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    // 获取驱动器图标
    const getDriveIcon = (drive: DriveInfo): React.JSX.Element => {
        if (drive.isRemovable || drive.busType === "USB") {
            return <DiscIcon className="cmd-drive-icon" />;
        }
        if (drive.isSystem) {
            return <ComponentInstanceIcon className="cmd-drive-icon" />;
        }
        return <DesktopIcon className="cmd-drive-icon" />;
    };

    // 处理刷新
    const handleRefresh = (): void => {
        dispatch(refreshDrives());
    };

    return (
        <Box p={4}>
            <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="bold">
                    磁盘驱动器
                </Text>
                <Tooltip label="刷新驱动器列表">
                    <IconButton
                        aria-label="刷新"
                        icon={
                            <UpdateIcon className="cmd-drive-icon cmd-drive-icon--sm" />
                        }
                        size="sm"
                        onClick={handleRefresh}
                        isLoading={loading}
                        isDisabled={loading}
                    />
                </Tooltip>
            </HStack>

            {/* 加载状态 */}
            {loading && (
                <Box mb={4}>
                    <HStack spacing={3}>
                        <Spinner size="sm" color="blue.500" />
                        <Text fontSize="sm" color="gray.600">
                            {loadingMessage || "正在加载..."}
                        </Text>
                    </HStack>
                </Box>
            )}

            {/* 错误提示 */}
            {error && !loading && (
                <Alert status="error" mb={4} borderRadius="md">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>加载失败</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Box>
                </Alert>
            )}

            {/* 驱动器列表 */}
            {!loading && drives.length === 0 && !error && (
                <Text color="gray.500" fontSize="sm">
                    未检测到驱动器
                </Text>
            )}

            <VStack spacing={3} align="stretch">
                {drives.map(drive => (
                    <Box
                        key={drive.device}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        borderColor="gray.200"
                        _hover={{ borderColor: "blue.300", bg: "gray.50" }}
                        transition="all 0.2s"
                    >
                        <HStack justify="space-between">
                            <HStack spacing={3}>
                                {getDriveIcon(drive)}
                                <VStack align="start" spacing={0}>
                                    <HStack>
                                        <Text fontWeight="medium">
                                            {drive.label || drive.description}
                                        </Text>
                                        {drive.isRemovable && (
                                            <Badge
                                                colorScheme="purple"
                                                size="sm"
                                            >
                                                可移动
                                            </Badge>
                                        )}
                                        {drive.isSystem && (
                                            <Badge colorScheme="blue" size="sm">
                                                系统
                                            </Badge>
                                        )}
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600">
                                        {drive.mountpoints[0]?.path} •{" "}
                                        {drive.fileSystem}
                                    </Text>
                                </VStack>
                            </HStack>

                            <VStack align="end" spacing={1}>
                                <Text fontSize="sm" fontWeight="medium">
                                    {formatSize(drive.available || 0)} 可用
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    共 {formatSize(drive.size)}
                                </Text>
                            </VStack>
                        </HStack>

                        {/* 使用进度条 */}
                        {drive.usePercent !== undefined && (
                            <Box mt={2}>
                                <Progress
                                    value={drive.usePercent}
                                    size="xs"
                                    colorScheme={
                                        drive.usePercent > 90
                                            ? "red"
                                            : drive.usePercent > 70
                                              ? "orange"
                                              : "blue"
                                    }
                                    borderRadius="full"
                                />
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    已使用 {drive.usePercent?.toFixed(1)}%
                                </Text>
                            </Box>
                        )}
                    </Box>
                ))}
            </VStack>
        </Box>
    );
};
