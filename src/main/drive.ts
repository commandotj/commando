import drivelist from "drivelist";

export interface DriveInfo {
    device: string;
    description: string;
    size: number;
    mountpoints: { path: string }[];
    isSystem: boolean;
    isRemovable: boolean;
}

export async function listDrives(): Promise<DriveInfo[]> {
    try {
        const drives = await drivelist.list();
        // 只返回有挂载点的设备，简化前端处理
        return drives
            .filter((d: unknown) => {
                const drive = d as Record<string, unknown>;
                return (
                    drive.mountpoints &&
                    Array.isArray(drive.mountpoints) &&
                    drive.mountpoints.length > 0
                );
            })
            .map((d: unknown) => {
                const drive = d as Record<string, unknown>;
                return {
                    device: drive.device as string,
                    description: drive.description as string,
                    size: drive.size as number,
                    mountpoints: drive.mountpoints as { path: string }[],
                    isSystem: drive.system as boolean,
                    isRemovable: drive.isRemovable as boolean,
                };
            });
    } catch (err) {
        console.error("[drivelist] error:", err);
        console.error("[drivelist] process.env.PATH:", process.env.PATH);
        return [];
    }
}
