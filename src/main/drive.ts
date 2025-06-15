const drivelist = require('drivelist');

export async function listDrives() {
    try {
        const drives = await drivelist.list();
        // 只返回有挂载点的设备，简化前端处理
        return drives
            .filter((d: any) => d.mountpoints && d.mountpoints.length > 0)
            .map((d: any) => ({
                device: d.device,
                description: d.description,
                size: d.size,
                mountpoints: d.mountpoints, // [{ path }]
                isSystem: d.system,
                isRemovable: d.isRemovable
            }));
    } catch (err) {
        console.error('[drivelist] error:', err);
        console.error('[drivelist] process.env.PATH:', (process as any).env.PATH);
        return [];
    }
}
