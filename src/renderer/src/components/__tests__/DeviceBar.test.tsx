// 注意：Radix DropdownMenu portal 相关交互（如菜单项点击）在 JSDOM 环境下无法可靠测试，建议用 e2e/集成测试覆盖。
import "@testing-library/jest-dom";
import { render, fireEvent, screen } from "@testing-library/react";
import DeviceBar, { DeviceInfo } from "../DeviceBar";

const devices: DeviceInfo[] = [
    {
        device: "disk1",
        description: "Macintosh HD",
        size: 1000000000,
        mountpoints: [{ path: "/" }],
        isSystem: true,
        isRemovable: false,
    },
    {
        device: "disk2",
        description: "External 1",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/One" }],
        isSystem: false,
        isRemovable: true,
    },
    {
        device: "disk3",
        description: "External 2",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/Two" }],
        isSystem: false,
        isRemovable: true,
    },
    {
        device: "disk4",
        description: "External 3",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/Three" }],
        isSystem: false,
        isRemovable: true,
    },
];

describe("DeviceBar", () => {
    it("主行渲染根挂载点按钮", () => {
        render(
            <DeviceBar
                devices={devices}
                currentPath="/"
                onDeviceClick={() => {}}
            />
        );
        // 只断言主行可见按钮（如 '/'），溢出项会被折叠进菜单
        expect(screen.getByText("/")).toBeInTheDocument();
        // 溢出项不会直接渲染在主行
        expect(screen.queryByText("/Volumes/One")).not.toBeInTheDocument();
    });

    it("点击设备按钮触发回调", () => {
        const onDeviceClick = jest.fn();
        render(
            <DeviceBar
                devices={devices}
                currentPath="/"
                onDeviceClick={onDeviceClick}
            />
        );
        fireEvent.click(screen.getByText("/Volumes/One"));
        expect(onDeviceClick).toHaveBeenCalledWith("/Volumes/One");
    });

    // 如需测试溢出菜单项，建议用 e2e 或补充菜单展开逻辑
});
